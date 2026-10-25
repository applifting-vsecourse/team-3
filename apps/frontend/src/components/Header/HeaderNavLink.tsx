import type { ReactNode } from "react"
import { Link, useLocation, type LinkProps } from "@tanstack/react-router"

import { navSection, type NavSection } from "@/components/navSection"
import { cn } from "@/lib/utils"

type HeaderNavLinkProps = LinkProps & {
  section: NavSection
  children: ReactNode
  className?: string
}

export function HeaderNavLink({ section, children, className, ...props }: HeaderNavLinkProps) {
  const isActive = navSection(useLocation().pathname) === section

  return (
    <Link
      {...props}
      // `navSection` decides what is active, not the router's prefix match:
      // `exact` keeps the router from marking a page that belongs elsewhere,
      // and the attributes it would set are set here instead.
      activeOptions={{ exact: true }}
      data-status={isActive ? "active" : undefined}
      aria-current={isActive ? "page" : undefined}
      // Active styling uses the data-status attribute rather than
      // `activeProps`: those classes would collide with the base ones and
      // Tailwind resolves such conflicts by stylesheet order, not by class order.
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        "data-[status=active]:bg-muted data-[status=active]:font-semibold data-[status=active]:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  )
}
