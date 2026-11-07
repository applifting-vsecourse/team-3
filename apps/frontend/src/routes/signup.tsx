import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import type { InboxCredentials } from "@/features/auth/api/simulatedInbox"
import { GoogleSignIn } from "@/features/auth/components/GoogleSignIn"
import { SignUpForm, type SignUpValues } from "@/features/auth/components/SignUpForm"
import { VerifyEmailStep } from "@/features/auth/components/VerifyEmailStep"
import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { safeRedirect } from "@/features/auth/lib/redirect"
import { NearestEvents } from "@/features/events/components/NearestEvents"

// `from`: the page to come back to, e.g. the event (B-012)
const signUpSearchParamsSchema = z.object({
  // TanStack parses `?from=123` into a number: such a `from` is dropped, not an error page
  from: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  validateSearch: signUpSearchParamsSchema,
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ href: safeRedirect(deps.from, ROUTES.events) })
  },
})

function SignUpPage() {
  const { from } = Route.useSearch()
  const navigate = useNavigate()
  const signUp = useSignUp()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // #236: signed up, not signed in: the link from the e-mail comes first
  const [signedUp, setSignedUp] = useState<InboxCredentials | null>(null)

  const handleSubmit = async (values: SignUpValues) => {
    setErrorMessage(null)
    try {
      // the verification link leads back to `from`, and from there to signing in
      await signUp.mutateAsync({ ...values, from })
      setSignedUp({ email: values.email, password: values.password })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Registrace se nepovedla. Zkus to prosím znovu.",
      )
    }
  }

  const signInLink = (label: string) => (
    <Link
      to={ROUTES.login}
      search={{ from }}
      // switching between sign-in and sign-up doesn't pile up in the history
      replace
      className="font-medium text-foreground underline underline-offset-4"
    >
      {label}
    </Link>
  )

  if (signedUp) {
    return (
      <>
        <Seo title="Ověř si e-mail" />
        <AuthLayout
          aside={<NearestEvents />}
          title="Ověř si e-mail"
          // the same for an address that already has an account: it doesn't tell which do
          description={`Odkaz k ověření jsme poslali na ${signedUp.email}. Jestli už tu účet máš, rovnou se přihlas.`}
          footer={signInLink("Zpět na přihlášení")}
        >
          <VerifyEmailStep
            email={signedUp.email}
            password={signedUp.password}
            from={from}
            // verified meanwhile (another tab): on to signing in
            onAlreadyVerified={() =>
              void navigate({ to: ROUTES.login, search: { from }, replace: true })
            }
          />
        </AuthLayout>
      </>
    )
  }

  return (
    <>
      <Seo title="Registrace" />
      <AuthLayout
        aside={<NearestEvents />}
        title="Registrace"
        description="Jeden účet pro přihlašování na akce i jejich pořádání."
        footer={<>Už máš účet? {signInLink("Přihlas se")}</>}
      >
        <SignUpForm
          isLoading={signUp.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
        <GoogleSignIn from={from} />
      </AuthLayout>
    </>
  )
}
