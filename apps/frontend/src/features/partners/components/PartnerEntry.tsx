import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { UsersRound } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/**
 * The way to Najdi parťáka from Můj profil (#84), under „Lidé, které znám“: a block on the
 * page separated by space, not a card (DESIGN.md › Layout).
 */
export function PartnerEntry() {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col items-start gap-3"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        Najdi <span className="highlight-keyword">parťáka</span>
      </h2>
      <p className="text-sm text-muted-foreground">Lidi z okolí se stejnými koníčky.</p>
      <Button
        asChild
        variant="outline"
      >
        <Link to={ROUTES.partners}>
          <UsersRound aria-hidden /> Najdi parťáka
        </Link>
      </Button>
    </section>
  )
}
