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
import { AuthRequestError } from "@/features/auth/lib/auth-errors"

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
  const requestError = reset.variables?.token === token ? reset.error : null
  const isInvalidLink =
    !token ||
    Boolean(error) ||
    (requestError instanceof AuthRequestError &&
      (requestError.code === "INVALID_TOKEN" || requestError.code === "TOKEN_EXPIRED"))

  const handleSubmit = (newPassword: string) => {
    if (!token) return
    reset.mutate(
      { token, newPassword },
      {
        onSuccess: () => {
          // the reset signed out every session, including this browser's
          queryClient.setQueryData(authKeys.session(), null)
          toast.success("Heslo je změněné. Přihlas se novým heslem.")
          void navigate({ to: ROUTES.login, replace: true })
        },
      },
    )
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
        {isInvalidLink ? (
          <p role="alert">Odkaz vypršel, už se použil nebo je neplatný. Pošli si nový.</p>
        ) : (
          <ResetPasswordForm
            isLoading={reset.isPending}
            errorMessage={requestError?.message}
            onSubmit={handleSubmit}
          />
        )}
      </AuthLayout>
    </>
  )
}
