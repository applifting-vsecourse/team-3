import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { LogoMark } from "@/components/Logo/Logo"
import { Button } from "@/components/ui/button"

/**
 * „Nic pro tebe?“ at the bottom of the landing page (Figma A-01d, A-01pd): the dark green
 * call-out with the logo and „Založit akci“.
 */
export function NothingForYou() {
  return (
    <aside
      aria-label="Nic pro tebe?"
      className="flex flex-col items-start gap-4 rounded-2xl border border-band-edge on-hero px-6 py-7 md:mt-8 md:flex-row md:items-center md:gap-6 md:px-8"
    >
      <LogoMark
        isOnHero
        className="size-12 md:size-14"
      />
      <div className="flex flex-1 flex-col gap-1">
        <p className="type-feature text-on-hero">Nic pro tebe?</p>
        <p className="type-lead text-on-hero-muted md:text-base">
          Založ vlastní akci a lidi se přidají. Stačí název, místo a čas.
        </p>
      </div>
      <Button
        asChild
        className="h-11 border border-primary-edge font-semibold"
      >
        <Link to={ROUTES.newEvent}>Založit akci</Link>
      </Button>
    </aside>
  )
}
