import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type PersonRowProps = {
  name: string
  /** A second line, e.g. „Skupina“. */
  description?: string
  /** Buttons under the text, e.g. Zamítnout / Schválit (Figma: Person row, Request). */
  actions?: ReactNode
  className?: string
}

/**
 * A person or a group with an avatar — organizer, participant, member
 * (Figma: Person row, Member) or a request with its actions (Request).
 */
export function PersonRow({ name, description, actions, className }: PersonRowProps) {
  return (
    <div className={cn("flex min-w-0 gap-3", actions ? "items-start" : "items-center", className)}>
      <Avatar size="lg">
        {/* Figma: Avatar — initials on the quiet brand fill */}
        <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className={cn("flex min-w-0 flex-col", actions && "gap-1")}>
        <span className="truncate text-sm font-semibold">{name}</span>
        {description ? (
          <span className="truncate text-sm text-muted-foreground">{description}</span>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </div>
  )
}
