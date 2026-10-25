import { ROUTES } from "@/app/routes"
import { HeaderNavLink } from "@/components/Header/HeaderNavLink"

// The logo already links home, so "Home" would be a duplicate.
// On mobile the bottom navigation takes over.
export function HeaderNav({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <nav
      aria-label="Hlavní navigace"
      className="hidden items-center gap-1 md:flex"
    >
      <HeaderNavLink
        to={ROUTES.events}
        section="events"
      >
        Akce
      </HeaderNavLink>
      <HeaderNavLink
        to={ROUTES.groups}
        section="groups"
      >
        Skupiny
      </HeaderNavLink>
      {isSignedIn ? (
        <HeaderNavLink
          to={ROUTES.myEvents}
          section="myEvents"
        >
          Moje akce
        </HeaderNavLink>
      ) : null}
    </nav>
  )
}
