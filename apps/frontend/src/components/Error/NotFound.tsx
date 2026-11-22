import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Button } from "@/components/ui/button"
import { PAGE } from "@/lib/pageLayout"

/**
 * A page of the app like any other (DESIGN.md › Layout, #370): the band with the title, one line
 * and the ways on, as the landing page's band has its buttons (#370). Under it `more`: the
 * upcoming events over the page's width, so the page isn't empty below the band. A slot, as
 * `components/` doesn't import from `features/`.
 */
export function NotFound({ more }: { more?: ReactNode } = {}) {
  return (
    <main className="flex-1">
      <PageBand
        title="Stránka nenalezena"
        description="Odkaz je neplatný, nebo stránka už neexistuje."
      >
        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            asChild
            className="h-11 px-5 text-base font-semibold"
          >
            <Link to={ROUTES.events}>Procházet akce</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            // as the landing page's band: `on-hero` gives the hover, the outline is the band's
            className="h-11 border-on-hero px-5 text-base font-semibold"
          >
            <Link to={ROUTES.home}>Na úvod</Link>
          </Button>
        </div>
      </PageBand>
      {more ? <div className={PAGE}>{more}</div> : null}
    </main>
  )
}
