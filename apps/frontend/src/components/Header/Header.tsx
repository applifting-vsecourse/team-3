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

/**
 * The header sits on the dark green band (Figma Header/App desktop, Header/Screen); the page's
 * band (PageBand) continues right under it. On the 1200 grid like the page (`PAGE`).
 * „Založit akci“ is not here: it sits with the page's content (DESIGN.md › Založit akci).
 */
export function Header({ userMenu, isSignedIn = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full on-hero">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-8 px-4 md:h-18 md:px-10">
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
