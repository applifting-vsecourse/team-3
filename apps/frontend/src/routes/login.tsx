import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignInForm } from "@/features/auth/components/SignInForm"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { safeRedirect } from "@/features/auth/lib/redirect"

// `from`: the page to come back to, e.g. the event (B-012)
const loginSearchParamsSchema = z.object({
  // TanStack parses `?from=123` into a number: such a `from` is dropped, not an error page
  from: z.string().optional().catch(undefined),
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
  const { from } = Route.useSearch()
  const navigate = useNavigate()
  const signIn = useSignIn()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setErrorMessage(null)
    try {
      await signIn.mutateAsync(values)
      // href, not to: the page may come with its search (the list's filters)
      await navigate({ href: safeRedirect(from, ROUTES.events) })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Přihlášení se nepovedlo. Zkuste to prosím znovu.",
      )
    }
  }

  return (
    <>
      <Seo title="Přihlášení" />
      <AuthLayout
        title="Přihlášení"
        description={
          from ? "Po přihlášení se vrátíte tam, kde jste byli." : "Vítejte zpět v HobbyHubu."
        }
        footer={
          <>
            Nemáte účet?{" "}
            <Link
              to={ROUTES.signup}
              search={{ from }}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Zaregistrujte se
            </Link>
          </>
        }
      >
        <SignInForm
          isLoading={signIn.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
        <p className="mt-4 text-sm">
          <Link
            to={ROUTES.forgotPassword}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Zapomněli jste heslo?
          </Link>
        </p>
      </AuthLayout>
    </>
  )
}
