import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type PersonRowProps = {
  name: string
  /** Provided only when the name represents a user, never a group. */
  userId?: string
  /** A second line, e.g. „Skupina“. */
  description?: string
  /**
   * What the person wrote, shown whole in quotes under the description, e.g.
   * the message with a request (Figma D-03, D-07, #175).
   */
  quote?: string | null
  /** Buttons under the text, e.g. Zamítnout / Schválit (Figma: Person row, Request). */
  actions?: ReactNode
  className?: string
}

/**
 * A person or a group with an avatar — organizer, participant, member
 * (Figma: Person row, Member) or a request with its actions (Request).
 */
export function PersonRow({
  name,
  userId,
  description,
  quote,
  actions,
  className,
}: PersonRowProps) {
  const hasMore = Boolean(actions) || Boolean(quote)
  return (
    <div className={cn("flex min-w-0 gap-3", hasMore ? "items-start" : "items-center", className)}>
      <Avatar size="lg">
        {/* Figma: Avatar — initials on the quiet brand fill */}
        <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className={cn("flex min-w-0 flex-col", hasMore && "gap-1")}>
        {userId ? (
          <Link
            className="truncate text-sm font-semibold underline underline-offset-4"
            to={ROUTES.userProfile}
            params={{ userId }}
          >
            {name}
          </Link>
        ) : (
          <span className="truncate text-sm font-semibold">{name}</span>
        )}
        {description ? (
          <span className="truncate text-sm text-muted-foreground">{description}</span>
        ) : null}
        {quote ? (
          // their own words: kept as written, line breaks too, and never cut off
          <p className="text-sm break-words whitespace-pre-line">„{quote}“</p>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </div>
  )
}
