import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/initials"
import { cn } from "@/lib/utils"

import { profilePhotoUrl } from "@/features/profile/api/profileUpload"

export function ProfileAvatar({
  name,
  version,
  preview,
  className,
}: {
  name: string
  version?: string | null
  preview?: string
  className?: string
}) {
  const [unavailable, setUnavailable] = useState<string>()
  const source = preview ?? (version ? profilePhotoUrl(version) : undefined)
  return (
    <Avatar
      aria-hidden
      className={cn("shrink-0 border border-tile-border", className)}
    >
      {source && unavailable !== source ? (
        <img
          key={source}
          crossOrigin={preview ? undefined : "use-credentials"}
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
