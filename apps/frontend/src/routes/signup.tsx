import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignUpForm } from "@/features/auth/components/SignUpForm"
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

  const handleSubmit = async (values: { name: string; email: string; password: string }) => {
    setErrorMessage(null)
    try {
      // signed in at once; the verification link leads back to `from` too
      await signUp.mutateAsync({ ...values, from })
      // replace: „Zpět“ on the page we return to mustn't lead back to the form
      await navigate({ href: safeRedirect(from, ROUTES.events), replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Registrace se nepovedla. Zkus to prosím znovu.",
      )
    }
  }

  return (
    <>
      <Seo title="Registrace" />
      <AuthLayout
        aside={<NearestEvents />}
        title="Registrace"
        description="Jeden účet pro přihlašování na akce i jejich pořádání."
        footer={
          <>
            Už máš účet?{" "}
            <Link
              to={ROUTES.login}
              search={{ from }}
              // switching between sign-in and sign-up doesn't pile up in the history
              replace
              className="font-medium text-foreground underline underline-offset-4"
            >
              Přihlas se
            </Link>
          </>
        }
      >
        <SignUpForm
          isLoading={signUp.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}
