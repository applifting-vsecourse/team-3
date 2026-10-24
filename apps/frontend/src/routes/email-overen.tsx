import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { authKeys } from "@/lib/auth-keys"

import { EmailVerifiedView } from "@/features/auth/components/EmailVerifiedView"
import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

export const Route = createFileRoute("/email-overen")({
  component: EmailVerifiedPage,
  // BetterAuth adds `error` (e.g. TOKEN_EXPIRED) when the link didn't work
  validateSearch: z.object({ error: z.string().optional() }),
})

function EmailVerifiedPage() {
  const { error } = Route.useSearch()
  const queryClient = useQueryClient()

  // the cached session still says „unverified“: refresh it, so the banner goes
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: authKeys.session() })
  }, [queryClient])

  return (
    <>
      <Seo title={error ? "E-mail se nepodařilo ověřit" : "E-mail je ověřený"} />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-sm px-4 py-16">
          <EmailVerifiedView error={error} />
        </div>
      </main>
    </>
  )
}
