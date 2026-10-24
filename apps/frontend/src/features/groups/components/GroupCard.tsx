import { Link } from "@tanstack/react-router"
import { Lock, Users } from "lucide-react"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"

import type { Group } from "@/features/groups/api/groupSchemas"
import { GROUP_TYPE_SHORT, groupFacts } from "@/features/groups/lib/formatGroup"

type GroupCardProps = {
  group: Group
  /** The type line; on „Moje“ it adds where I stand („· Správce“, a waiting request). */
  typeLabel?: string
  /** A group I run opens its management (A-07m), any other its page. */
  linkTo?: "page" | "manage"
  /** h3 under a section heading („Moje skupiny (2)“), h2 straight in the list. */
  titleAs?: "h2" | "h3"
}

/** A group in the list (Figma: Group card/List); the whole card is a link. */
export function GroupCard({
  group,
  typeLabel = GROUP_TYPE_SHORT[group.type],
  linkTo = "page",
  titleAs: Title = "h2",
}: GroupCardProps) {
  const TypeIcon = group.type === "closed" ? Lock : Users
  return (
    <Link
      to={linkTo === "manage" ? "/skupiny/$groupId/sprava" : "/skupiny/$groupId"}
      params={{ groupId: group.id }}
      className="flex h-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors outline-none hover:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ActivityTile icon={group.activity.category.icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title className="truncate text-base font-semibold tracking-tight">{group.name}</Title>
        <p className="truncate text-sm text-muted-foreground">{groupFacts(group)}</p>
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <TypeIcon
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="truncate">{typeLabel}</span>
        </p>
      </div>
    </Link>
  )
}
