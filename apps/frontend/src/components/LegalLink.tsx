import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import type { ROUTES } from "@/app/routes"

type LegalLinkProps = {
  to: typeof ROUTES.terms | typeof ROUTES.privacy
  children: ReactNode
}

/**
 * A link to the terms or the privacy notice from a consent (#153, #154). It
 * opens a new tab, so what's typed in the form stays. In a checkbox's label,
 * clicking it only follows the link; the checkbox stays as it is.
 */
export function LegalLink({ to, children }: LegalLinkProps) {
  return (
    <Link
      to={to}
      target="_blank"
      className="font-medium text-foreground underline underline-offset-4"
    >
      {children}
      <span className="sr-only"> (otevře se v novém panelu)</span>
    </Link>
  )
}
