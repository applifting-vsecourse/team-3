import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"
import { useRequestPasswordReset } from "@/features/auth/hooks/usePasswordReset"

export const Route = createFileRoute("/zapomenute-heslo")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const request = useRequestPasswordReset()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async ({ email }: { email: string }) => {
    setErrorMessage(null)
    try {
      await request.mutateAsync(email)
      setSentTo(email)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Odkaz se nepodařilo odeslat")
    }
  }

  return (
    <>
      <Seo title="Zapomenuté heslo" />
      <AuthLayout
        title="Zapomenuté heslo"
        description="Pošleme ti odkaz, přes který si nastavíš nové heslo."
        footer={
          <Link
            to={ROUTES.login}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Zpět na přihlášení
          </Link>
        }
      >
        {sentTo ? (
          // the same answer whether or not the e-mail has an account
          <p role="status">
            Pokud k e-mailu <span className="font-semibold">{sentTo}</span> existuje účet, poslali
            jsme na něj odkaz pro nastavení nového hesla. Odkaz platí 1 hodinu.
          </p>
        ) : (
          <ForgotPasswordForm
            isLoading={request.isPending}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        )}
      </AuthLayout>
    </>
  )
}
