import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/Logo/Logo"

export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      // the logo is 28 px tall: 8 px above and below make the tap target 44 px, and the negative
      // margin keeps the header as it was (DESIGN.md › Accessibility, #370)
      className="-my-2 inline-flex rounded-md py-2"
    >
      <Logo isOnHero />
    </Link>
  )
}
