import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

type HeaderNavLinkProps = LinkProps & {
  children: ReactNode
  className?: string
}

export function HeaderNavLink({ children, className, ...props }: HeaderNavLinkProps) {
  return (
    <Link
      {...props}
      // Active styling uses the router's data-status attribute rather than
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
