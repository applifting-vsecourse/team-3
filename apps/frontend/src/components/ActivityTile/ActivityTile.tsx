import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/utils"

import BallIcon from "./icons/ball.svg?react"
import DiceIcon from "./icons/dice.svg?react"
import MessageIcon from "./icons/message.svg?react"
import MountainIcon from "./icons/mountain.svg?react"
import MusicIcon from "./icons/music.svg?react"
import RacketIcon from "./icons/racket.svg?react"
import RouteIcon from "./icons/route.svg?react"
import UsersIcon from "./icons/users.svg?react"

// Keys are ActivityCategory.icon from the catalog (B-002); the drawings are
// the Figma component „Activity tile“, one variant per category. Stroke is
// currentColor so the colour comes from the token, not the file.
const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  ball: BallIcon,
  racket: RacketIcon,
  route: RouteIcon,
  mountain: MountainIcon,
  dice: DiceIcon,
  message: MessageIcon,
  music: MusicIcon,
  users: UsersIcon,
}

type ActivityTileProps = {
  /** Icon name of the activity's category. */
  icon: string
  className?: string
  /** A smaller tile needs a smaller icon, e.g. `size-5` in a 32 px tile; 28 px by default. */
  iconClassName?: string
}

/**
 * Category icon in place of an event photo (Figma: Activity tile): `secondary` with its
 * `tile-border` — the fill alone is 1.2:1 against the card (DESIGN.md › Colour).
 */
export function ActivityTile({ icon, className, iconClassName }: ActivityTileProps) {
  const Icon = ICONS[icon]
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-16 shrink-0 items-center justify-center rounded-lg border border-tile-border bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {Icon ? <Icon className={iconClassName} /> : null}
    </div>
  )
}
