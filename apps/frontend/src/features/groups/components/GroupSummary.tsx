import { Lock, MapPin, Users } from "lucide-react"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { DetailRow } from "@/components/DetailRow/DetailRow"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GROUP_TYPE_LONG, memberCountLabel } from "@/features/groups/lib/formatGroup"

/** Activity and name, the top of the group page and of its management (Figma A-08, D-07d). */
export function GroupHeading({ group }: { group: GroupDetail }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <ActivityTile icon={group.activity.category.icon} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{group.activity.name}</span>
          <span className="text-sm text-muted-foreground">{group.activity.category.name}</span>
        </div>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{group.name}</h1>
    </>
  )
}

/**
 * Locality, type and approved members (Figma: Detail row). `typeLabels`: the
 * management speaks to the admin („žádosti schvaluješ ty“, D-07d).
 */
export function GroupFacts({
  group,
  typeLabels = GROUP_TYPE_LONG,
}: {
  group: GroupDetail
  typeLabels?: Record<GroupDetail["type"], string>
}) {
  return (
    <dl className="flex flex-col gap-3 md:gap-4">
      <DetailRow
        icon={MapPin}
        label="Lokalita"
      >
        {group.locality.name}
      </DetailRow>
      <DetailRow
        icon={group.type === "closed" ? Lock : Users}
        label="Typ skupiny"
      >
        {typeLabels[group.type]}
      </DetailRow>
      <DetailRow
        icon={Users}
        label="Členové"
      >
        {memberCountLabel(group.memberCount)}
      </DetailRow>
    </dl>
  )
}
