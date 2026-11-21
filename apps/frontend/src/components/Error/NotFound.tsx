import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Button } from "@/components/ui/button"
import { PAGE } from "@/lib/pageLayout"

/**
 * A page of the app like any other (DESIGN.md › Layout, #370): the band with the title and one
 * line, the ways on under it — not a lone text in the middle of an empty screen.
 */
export function NotFound() {
  return (
    <main className="flex-1">
      <PageBand
        title="Stránka nenalezena"
        description="Odkaz je neplatný, nebo stránka už neexistuje."
      />
      <div className={PAGE}>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={ROUTES.events}>Procházet akce</Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.home}>Na úvod</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
