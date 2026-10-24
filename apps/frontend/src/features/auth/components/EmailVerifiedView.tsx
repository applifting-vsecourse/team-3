import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/** BetterAuth's codes on a link that didn't work, said shortly. */
const REASONS: Record<string, string> = {
  TOKEN_EXPIRED: "Odkaz už vypršel.",
  INVALID_TOKEN: "Odkaz je neplatný.",
  USER_NOT_FOUND: "Účet k tomuto odkazu už neexistuje.",
}

type EmailVerifiedViewProps = {
  /** BetterAuth's code when the link didn't work, e.g. `TOKEN_EXPIRED`. */
  error?: string
  /** Signed in and still unverified, e.g. the page was opened by hand. */
  isUnverified?: boolean
  /** Where „Pokračovat“ leads: the page the sign-up started from (B-012). */
  continueTo?: string
}

/** Figma B-02: what the link in the verification e-mail led to. */
export function EmailVerifiedView({
  error,
  isUnverified,
  continueTo = ROUTES.events,
}: EmailVerifiedViewProps) {
  if (error || isUnverified) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {error ? "E-mail se nepodařilo ověřit" : "E-mail zatím není ověřený"}
        </h1>
        <p className="text-muted-foreground">
          {error
            ? `${REASONS[error] ?? "Odkaz je neplatný."} Nový odkaz si pošlete z pruhu nahoře, když jste přihlášení.`
            : "Otevřete odkaz z e-mailu, nebo si nový pošlete z pruhu nahoře."}
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-3 self-start"
        >
          <a href={continueTo}>Pokračovat</a>
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
        {/* a plain link: the page may come with its search, which `to` can't take as text */}
        <a href={continueTo}>Pokračovat</a>
      </Button>
    </section>
  )
}
