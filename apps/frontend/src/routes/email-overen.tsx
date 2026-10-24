import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { authKeys } from "@/lib/auth-keys"

import { EmailVerifiedView } from "@/features/auth/components/EmailVerifiedView"
import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import { safeRedirect } from "@/features/auth/lib/redirect"

export const Route = createFileRoute("/email-overen")({
  component: EmailVerifiedPage,
  // BetterAuth adds `error` (e.g. TOKEN_EXPIRED) when the link didn't work;
  // `from` is the page the sign-up started from (B-012)
  validateSearch: z.object({ error: z.string().optional(), from: z.string().optional() }),
})

function EmailVerifiedPage() {
  const { error, from } = Route.useSearch()
  const queryClient = useQueryClient()
  const { user } = useSession()
  const [isRefreshed, setIsRefreshed] = useState(false)

  // The cached session still says „unverified“: refresh it (the banner then
  // goes), and only then trust it, so success doesn't flash up as a failure.
  useEffect(() => {
    void queryClient
      .invalidateQueries({ queryKey: authKeys.session() })
      .finally(() => setIsRefreshed(true))
  }, [queryClient])

  return (
    <>
      <Seo title={error ? "E-mail se nepodařilo ověřit" : "E-mail je ověřený"} />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-sm px-4 py-16">
          {isRefreshed || error ? (
            <EmailVerifiedView
              error={error}
              isUnverified={Boolean(user && !user.emailVerified)}
              continueTo={safeRedirect(from, ROUTES.events)}
            />
          ) : (
            <p
              aria-busy
              className="text-muted-foreground"
            >
              Načítám…
            </p>
          )}
        </div>
      </main>
    </>
  )
}
