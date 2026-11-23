import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { imageUrl } from "@/lib/image"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

/**
 * The uploaded photo (#64), its small variant (480 px is plenty for an avatar),
 * or the initials as in the header.
 */
export function ProfileAvatar({
  name,
  photoKey,
  preview,
  className,
}: {
  name: string
  photoKey?: string | null
  preview?: string
  className?: string
}) {
  const [unavailable, setUnavailable] = useState<string>()
  const source = preview ?? (photoKey ? `${imageUrl(photoKey)}/small` : undefined)
  return (
    <Avatar
      aria-hidden
      className={cn("shrink-0 border border-tile-border", className)}
    >
      {source && unavailable !== source ? (
        <img
          key={source}
          src={source}
          alt=""
          className="size-full object-cover"
          onError={() => setUnavailable(source)}
        />
      ) : (
        <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
          {initials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
