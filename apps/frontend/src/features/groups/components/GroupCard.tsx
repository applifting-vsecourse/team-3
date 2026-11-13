import { Link } from "@tanstack/react-router"
import { Lock, Users } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { StatusBadge } from "@/components/StatusBadge/StatusBadge"

import type { Group } from "@/features/groups/api/groupSchemas"
import { GROUP_TYPE_SHORT, groupFacts } from "@/features/groups/lib/formatGroup"

type GroupCardProps = {
  group: Group
  /** The type line. */
  typeLabel?: string
  /** Instead of „Florbal · Praha 9 · 8 členů“, e.g. the requests to decide in Spravuju. */
  facts?: string
  /** My request waits: the badge „Čeká na schválení“ as on an event's card (Figma C-04, #304). */
  isRequestPending?: boolean
  /** A group I run opens its management (A-07m), any other its page. */
  linkTo?: "page" | "manage"
  /** h3 under a section heading („Spravuju (1)“), h2 straight in the list. */
  titleAs?: "h2" | "h3"
}

/**
 * A group in the list (Figma: Group card/List, A-07, A-01d); the whole card is a link. It shows
 * its activity's photo (one per activity from the library); without one, the Activity tile.
 */
export function GroupCard({
  group,
  typeLabel = GROUP_TYPE_SHORT[group.type],
  facts,
  isRequestPending = false,
  linkTo = "page",
  titleAs: Title = "h2",
}: GroupCardProps) {
  const TypeIcon = group.type === "closed" ? Lock : Users
  const photo = activityPhoto(group.activity.slug)
  return (
    <Link
      to={linkTo === "manage" ? "/skupiny/$groupId/sprava" : "/skupiny/$groupId"}
      params={{ groupId: group.id }}
      className="flex h-full items-center gap-3.5 rounded-2xl border border-card-border bg-card p-3 text-card-foreground transition-colors outline-none hover:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {photo ? (
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes="72px"
          alt=""
          loading="lazy"
          decoding="async"
          // the cards' colour grade (DESIGN.md › Event card)
          className="size-18 shrink-0 rounded-xl object-cover contrast-110 saturate-86"
        />
      ) : (
        <ActivityTile icon={group.activity.category.icon} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title className="truncate type-card-heading">{group.name}</Title>
        <p className="truncate text-sm text-muted-foreground">{facts ?? groupFacts(group)}</p>
        <div className="flex min-w-0 items-center gap-2">
          {isRequestPending ? <StatusBadge status={{ kind: "pending" }} /> : null}
          <p className="flex min-w-0 items-center gap-1.5 text-caption font-medium text-muted-foreground">
            <TypeIcon
              aria-hidden
              className="size-4 shrink-0"
            />
            <span className="truncate">{typeLabel}</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
