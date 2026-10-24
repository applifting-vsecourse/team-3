import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type PersonRowProps = {
  name: string
  /** A second line, e.g. „Skupina“. */
  description?: string
  className?: string
}

/** A person or a group with an avatar — organizer, participant, member (Figma: Person row). */
export function PersonRow({ name, description, className }: PersonRowProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar size="lg">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-medium">{name}</span>
        {description ? (
          <span className="truncate text-sm text-muted-foreground">{description}</span>
        ) : null}
      </div>
    </div>
  )
}
