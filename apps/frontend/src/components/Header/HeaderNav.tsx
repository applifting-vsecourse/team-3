import { ROUTES } from "@/app/routes"
import { HeaderNavLink } from "@/components/Header/HeaderNavLink"

// The logo already links home, so "Home" would be a duplicate.
// On mobile the bottom navigation takes over.
export function HeaderNav() {
  return (
    <nav
      aria-label="Hlavní navigace"
      className="hidden items-center gap-1 md:flex"
    >
      <HeaderNavLink to={ROUTES.events}>Akce</HeaderNavLink>
      <HeaderNavLink to={ROUTES.groups}>Skupiny</HeaderNavLink>
    </nav>
  )
}
