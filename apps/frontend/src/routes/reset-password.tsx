import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { authKeys } from "@/lib/auth-keys"

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"
import { useResetPassword } from "@/features/auth/hooks/usePasswordReset"

// The link in the e-mail carries `token`; BetterAuth adds `error` to an
// expired or invalid one.
const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: searchSchema,
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reset = useResetPassword()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (newPassword: string) => {
    if (!token) return
    setErrorMessage(null)
    try {
      await reset.mutateAsync({ token, newPassword })
      // the reset signed out every session, this browser's too: without this
      // the login page would still see the cached session and send the user on
      queryClient.setQueryData(authKeys.session(), null)
      toast.success("Heslo je změněné. Přihlas se novým heslem.")
      await navigate({ to: ROUTES.login })
    } catch (resetError) {
      setErrorMessage(
        resetError instanceof Error ? resetError.message : "Heslo se nepodařilo změnit",
      )
    }
  }

  const backToRequest = (
    <Link
      to={ROUTES.forgotPassword}
      className="font-medium text-foreground underline underline-offset-4"
    >
      Poslat nový odkaz
    </Link>
  )

  return (
    <>
      <Seo title="Nové heslo" />
      <AuthLayout
        title="Nové heslo"
        description="Zvol si nové heslo k účtu."
        footer={backToRequest}
      >
        {!token || error ? (
          <p role="alert">Odkaz je neplatný, nebo už vypršel. Pošli si prosím nový.</p>
        ) : (
          <ResetPasswordForm
            isLoading={reset.isPending}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        )}
      </AuthLayout>
    </>
  )
}
