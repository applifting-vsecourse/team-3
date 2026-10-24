import type { ReactNode } from "react"
import { Link, useMatchRoute } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { HeaderNav } from "@/components/Header/HeaderNav"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { Button } from "@/components/ui/button"

type HeaderProps = {
  // Auth-aware menu (sign-in CTA / user dropdown). Passed as a slot so
  // `components/` doesn't have to import from `features/auth`.
  userMenu: ReactNode
  /** Adds „Moje akce“ to the navigation and, on desktop, „Založit akci“. */
  isSignedIn?: boolean
}

export function Header({ userMenu, isSignedIn = false }: HeaderProps) {
  // on the form itself it would lead nowhere and compete with „Zveřejnit akci“
  const isOnNewEvent = Boolean(useMatchRoute()({ to: ROUTES.newEvent }))
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-8 px-4 md:h-18 md:px-10">
        <HeaderLogo />
        <HeaderNav isSignedIn={isSignedIn} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher />
          {/* desktop only (Figma: Header/App desktop); on mobile „Založit akci“
              floats over the page instead, under the thumb */}
          {isSignedIn && !isOnNewEvent ? (
            <Button
              asChild
              className="hidden h-11 px-4 md:inline-flex"
            >
              <Link to={ROUTES.newEvent}>
                <Plus />
                Založit akci
              </Link>
            </Button>
          ) : null}
          {userMenu}
        </div>
      </div>
    </header>
  )
}
