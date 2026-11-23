import { Link } from "@tanstack/react-router"
import { UsersRound } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/**
 * The way to Najdi parťáka from Můj profil (#84), under „Lidé, které znám“: one line and the
 * button, a block separated by space, not a card (DESIGN.md › Layout). No heading of its own:
 * it would only repeat the button.
 */
export function PartnerEntry() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">Lidi z okolí se stejnými koníčky.</p>
      <Button
        asChild
        variant="outline"
      >
        <Link to={ROUTES.partners}>
          <UsersRound aria-hidden /> Najdi parťáka
        </Link>
      </Button>
    </div>
  )
}
