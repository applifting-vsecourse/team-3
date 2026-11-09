import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import type { InboxCredentials } from "@/features/auth/api/simulatedInbox"
import { GoogleSignIn } from "@/features/auth/components/GoogleSignIn"
import { SignInForm } from "@/features/auth/components/SignInForm"
import { VerifyEmailStep } from "@/features/auth/components/VerifyEmailStep"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import {
  AuthRequestError,
  EMAIL_NOT_VERIFIED,
  googleSignInErrorMessage,
} from "@/features/auth/lib/auth-errors"
import { safeRedirect } from "@/features/auth/lib/redirect"
import { NearestEvents } from "@/features/events/components/NearestEvents"

// `from`: the page to come back to, e.g. the event (B-012); `error`: why
// Google sent the user back here without signing in (#154)
const loginSearchParamsSchema = z.object({
  // TanStack parses `?from=123` into a number: such a `from` is dropped, not an error page
  from: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: loginSearchParamsSchema,
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    // already signed in: straight on to where signing in would lead
    throw redirect({ href: safeRedirect(deps.from, ROUTES.events) })
  },
})

function LoginPage() {
  const { from, error } = Route.useSearch()
  const navigate = useNavigate()
  const signIn = useSignIn()
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error ? googleSignInErrorMessage(error) : null,
  )
  // #236: what the refused sign-in was for; kept after „Zpět na přihlášení“ to fill the e-mail in
  const [unverified, setUnverified] = useState<InboxCredentials | null>(null)
  const [isVerifyStepShown, setIsVerifyStepShown] = useState(false)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setErrorMessage(null)
    try {
      await signIn.mutateAsync(values)
      // href, not to: the page may come with its search (the list's filters)
      // replace: „Zpět“ on the page we return to mustn't lead back to the login.
      // Coming from an event, it is then in the history twice (one „Zpět“ shows
      // it again): the login can't see the entry before it, so it can't go back.
      await navigate({ href: safeRedirect(from, ROUTES.events), replace: true })
    } catch (error) {
      // only a verified e-mail signs in: not an error under the form, the next step instead
      if (error instanceof AuthRequestError && error.code === EMAIL_NOT_VERIFIED) {
        setUnverified(values)
        setIsVerifyStepShown(true)
        return
      }
      setErrorMessage(
        error instanceof Error ? error.message : "Přihlášení se nepovedlo. Zkus to prosím znovu.",
      )
    }
  }

  if (unverified && isVerifyStepShown) {
    return (
      <>
        <Seo title="Ověř si e-mail" />
        <AuthLayout
          aside={<NearestEvents />}
          title="Ověř si e-mail"
          description={`E-mail ${unverified.email} zatím není ověřený a bez toho se přihlásit nejde.`}
          footer={
            <Button
              variant="link"
              className="h-auto p-0 font-medium underline"
              onClick={() => setIsVerifyStepShown(false)}
            >
              Zpět na přihlášení
            </Button>
          }
        >
          <VerifyEmailStep
            email={unverified.email}
            password={unverified.password}
            from={from}
          />
        </AuthLayout>
      </>
    )
  }

  return (
    <>
      <Seo title="Přihlášení" />
      <AuthLayout
        aside={<NearestEvents />}
        title="Přihlášení"
        description={from ? "Po přihlášení tě vrátíme zpátky." : "Vítej zpátky v HobbyHubu."}
        footer={
          <>
            Nemáš účet?{" "}
            <Link
              to={ROUTES.signup}
              search={{ from }}
              // switching between sign-in and sign-up doesn't pile up in the history
              replace
              className="font-medium text-foreground underline underline-offset-4"
            >
              Zaregistruj se
            </Link>
          </>
        }
      >
        <SignInForm
          defaultEmail={unverified?.email}
          isLoading={signIn.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
        <p className="mt-4 text-sm">
          <Link
            to={ROUTES.forgotPassword}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Zapomenuté heslo?
          </Link>
        </p>
        <GoogleSignIn
          from={from}
          startedOn={ROUTES.login}
        />
      </AuthLayout>
    </>
  )
}
