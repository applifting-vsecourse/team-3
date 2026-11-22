import type { ReactNode } from "react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { HeaderNav } from "@/components/Header/HeaderNav"

type HeaderProps = {
  // Auth-aware menu (sign-in CTA / user dropdown). Passed as a slot so
  // `components/` doesn't have to import from `features/auth`.
  userMenu: ReactNode
  /** Adds „Moje“ to the navigation. */
  isSignedIn?: boolean
  /** Phone only: the screen's action (Figma Header/Screen), e.g. „Hledat“ on /akce (#57). */
  screenAction?: ReactNode
  /** The bell (#86, Figma Zvonek): before the screen's action and the avatar. */
  notifications?: ReactNode
}

/**
 * The header sits on the dark green band (Figma Header/App desktop, Header/Screen); the page's
 * band (PageBand) continues right under it. On the 1200 grid like the page (`PAGE`).
 * „Založit akci“ is not here: it sits with the page's content (DESIGN.md › Založit akci).
 * On a phone a detail's bar (SubBar, Figma Header/Sub) replaces it (A-05, A-08, D-03, D-07),
 * so a page with one has no header there — the bottom navigation stays.
 */
export function Header({ userMenu, isSignedIn = false, screenAction, notifications }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full on-hero max-md:[:root:has([data-slot=sub-bar])_&]:hidden">
      {/* gap-4 on a phone: the logo, „Hledat“ and the avatar were 1 px wider than 320 px with
          gap-8, and the whole page scrolled sideways (#370) */}
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 md:h-18 md:gap-8 md:px-10">
        <HeaderLogo />
        <HeaderNav isSignedIn={isSignedIn} />
        {/* under 360 px the bell, the magnifier and the avatar stand closer, so 320 px keeps
            its 16 px edges with room to spare (review #398) */}
        <div className="ml-auto flex items-center gap-2 max-[359px]:gap-1">
          {notifications}
          {screenAction ? <div className="md:hidden">{screenAction}</div> : null}
          {userMenu}
        </div>
      </div>
    </header>
  )
}
