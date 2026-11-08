import { Lock, MapPin, Users } from "lucide-react"

import { DetailRow } from "@/components/DetailRow/DetailRow"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GROUP_TYPE_LONG, memberCountLabel } from "@/features/groups/lib/formatGroup"

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
