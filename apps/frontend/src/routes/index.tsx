import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

// Placeholder until the real landing page with upcoming events (US-01, #36).
function LandingPage() {
  const { user } = useSession()

  return (
    <>
      <Seo />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-2xl px-4 pt-16 pb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Najdi partu na svůj koníček.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-pretty text-muted-foreground">
            HobbyHub spojuje lidi, kteří chtějí sportovat, hrát nebo tvořit spolu. Najdi akci ve
            svém okolí, nebo založ vlastní, když ti chybí lidi.
          </p>

          {/* The call to action depends on who is asking: no point offering an
              account to someone who already has one. */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Button
                asChild
                size="lg"
              >
                <Link to={ROUTES.events}>Procházet akce</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="lg"
                >
                  <Link to={ROUTES.signup}>Zaregistrovat se</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                >
                  <Link to={ROUTES.events}>Procházet akce</Link>
                </Button>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
