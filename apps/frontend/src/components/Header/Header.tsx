import type { ReactNode } from "react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { HeaderNav } from "@/components/Header/HeaderNav"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"

type HeaderProps = {
  // Auth-aware menu (sign-in CTA / user dropdown). Passed as a slot so
  // `components/` doesn't have to import from `features/auth`.
  userMenu: ReactNode
  /** Adds „Moje akce“ to the navigation. */
  isSignedIn?: boolean
}

// „Založit akci“ is not here: it sits with the page's content (DESIGN.md › Založit akci).
export function Header({ userMenu, isSignedIn = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-8 px-4 md:h-18 md:px-10">
        <HeaderLogo />
        <HeaderNav isSignedIn={isSignedIn} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher />
          {userMenu}
        </div>
      </div>
    </header>
  )
}
