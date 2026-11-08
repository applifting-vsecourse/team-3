import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/Logo/Logo"

export function HeaderLogo() {
  return (
    <Link
      to={ROUTES.home}
      className="rounded-md"
    >
      <Logo isOnHero />
    </Link>
  )
}
