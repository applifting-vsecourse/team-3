import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { authErrorMessage } from "@/features/auth/lib/auth-errors"

type EmailVerifiedViewProps = {
  /** BetterAuth's code when the link didn't work, e.g. `TOKEN_EXPIRED`. */
  error?: string
}

/** Figma B-02: what the link in the verification e-mail led to. */
export function EmailVerifiedView({ error }: EmailVerifiedViewProps) {
  if (error) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">E-mail se nepodařilo ověřit</h1>
        <p className="text-muted-foreground">
          {authErrorMessage({ code: error }, "Odkaz je neplatný. Pošlete si prosím nový.")} Nový
          odkaz pošlete z pruhu nahoře, když jste přihlášení.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-3 self-start"
        >
          <Link to={ROUTES.events}>Pokračovat na akce</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">E-mail je ověřený</h1>
      <p className="text-muted-foreground">
        Teď se můžete hlásit na akce a zakládat vlastní akce i skupiny.
      </p>
      <Button
        asChild
        className="mt-3 self-start"
      >
        <Link to={ROUTES.events}>Pokračovat</Link>
      </Button>
    </section>
  )
}
