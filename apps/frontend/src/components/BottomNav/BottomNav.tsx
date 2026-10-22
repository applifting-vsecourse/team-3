import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { List, LogIn, User, Users } from "lucide-react"

import { ROUTES } from "@/app/routes"

type BottomNavProps = {
  // Passed in rather than read from the session so `components/` doesn't
  // have to import from `features/auth`.
  isSignedIn: boolean
  // While the session loads we don't know whether to offer Přihlásit or
  // Profil, so the slot stays empty instead of flashing the wrong one.
  isSessionPending: boolean
}

/**
 * Mobile navigation (Figma: Nav/Bottom). The map is part of /akce, not a
 * separate item. "Moje akce" joins once that page exists (#44).
 */
export function BottomNav({ isSignedIn, isSessionPending }: BottomNavProps) {
  return (
    <nav
      aria-label="Hlavní navigace"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center border-t border-border bg-background pt-1 pb-2 md:hidden"
    >
      <BottomNavLink
        to={ROUTES.events}
        icon={<List className="size-5" />}
      >
        Akce
      </BottomNavLink>
      <BottomNavLink
        to={ROUTES.groups}
        icon={<Users className="size-5" />}
      >
        Skupiny
      </BottomNavLink>
      {isSessionPending ? (
        <span className="flex-1" />
      ) : isSignedIn ? (
        <BottomNavLink
          to={ROUTES.profile}
          icon={<User className="size-5" />}
        >
          Profil
        </BottomNavLink>
      ) : (
        <BottomNavLink
          to={ROUTES.login}
          icon={<LogIn className="size-5" />}
        >
          Přihlásit
        </BottomNavLink>
      )}
    </nav>
  )
}

type BottomNavLinkProps = LinkProps & {
  icon: ReactNode
  children: ReactNode
}

function BottomNavLink({ icon, children, ...props }: BottomNavLinkProps) {
  return (
    <Link
      {...props}
      // Same data-status approach as HeaderNavLink: the indicator pill and the
      // label react to the router's active state via group-data variants.
      className="group flex flex-1 flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground data-[status=active]:font-semibold data-[status=active]:text-foreground"
    >
      <span className="flex h-7 w-13 items-center justify-center rounded-full text-foreground group-data-[status=active]:bg-primary group-data-[status=active]:text-primary-foreground">
        {icon}
      </span>
      {children}
    </Link>
  )
}
