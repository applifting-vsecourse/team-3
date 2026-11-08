import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

type PersonAvatarProps = {
  name: string
  /** „Ty“ in a list of people: `avatar-self`, without the outline — the fill alone has 3:1. */
  isSelf?: boolean
  className?: string
}

/**
 * Initials in a circle (Figma: Avatar, Ty=Ne / Ty=Ano): `secondary` with its `tile-border`
 * (the fill alone is 1.2:1 against the card, DESIGN.md › Colour). Decoration: the name
 * beside it or in its label says who it is.
 */
export function PersonAvatar({ name, isSelf = false, className }: PersonAvatarProps) {
  return (
    <Avatar
      size="lg"
      aria-hidden
      className={className}
    >
      <AvatarFallback
        className={cn(
          "font-semibold",
          isSelf
            ? "bg-avatar-self text-avatar-self-foreground"
            : "border border-tile-border bg-secondary text-secondary-foreground",
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
