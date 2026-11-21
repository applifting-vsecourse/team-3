import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Button } from "@/components/ui/button"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

/**
 * A page of the app like any other (DESIGN.md › Layout, #370): the band with the title and one
 * line, the ways on under it — not a lone text in the middle of an empty screen. `aside`: the
 * upcoming events beside them from lg, under them on a phone, so the page isn't empty below
 * two buttons (DESIGN.md › Layout: no big empty areas). A slot, as `components/` doesn't import
 * from `features/`.
 */
export function NotFound({ aside }: { aside?: ReactNode } = {}) {
  return (
    <main className="flex-1">
      <PageBand
        title="Stránka nenalezena"
        description="Odkaz je neplatný, nebo stránka už neexistuje."
      />
      <div
        className={cn(
          PAGE,
          "gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-start lg:gap-12",
        )}
      >
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
        {aside ? <aside className="min-w-0">{aside}</aside> : null}
      </div>
    </main>
  )
}
