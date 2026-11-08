import { useMemo } from "react"

import { ROUTES } from "@/app/routes"
import { homeGridColumns, HomeSection } from "@/components/HomeSection/HomeSection"
import { cn } from "@/lib/utils"

import { groupsSchema } from "@/features/groups/api/groupSchemas"
import { GroupCard } from "@/features/groups/components/GroupCard"

type RecruitingGroupsProps = {
  /** The groups section of GET /api/home, checked here against GET /api/groups' shape. */
  groups: unknown[]
  /** `?lokalita=` of „Všechny skupiny“: the page's locality. */
  lokalita: string
}

/**
 * „Tyhle skupiny rozšiřují partu“ on the landing page (#182, PO 4. 11.; Figma A-01d, A-01pd):
 * active groups nearby with an upcoming event, to join or ask to join, as group cards.
 */
export function RecruitingGroups({ groups: input, lokalita }: RecruitingGroupsProps) {
  const groups = useMemo(() => groupsSchema.parse(input), [input])
  if (groups.length === 0) return null
  return (
    <HomeSection
      heading={{ before: "Tyhle skupiny ", keyword: "rozšiřují", after: " partu" }}
      description="Pravidelně se potkávají a hledají nové členy"
      more={{ label: "Všechny skupiny", link: { to: ROUTES.groups, search: { lokalita } } }}
    >
      <ul className={cn("grid grid-cols-1 gap-3 md:gap-6", homeGridColumns(groups.length))}>
        {groups.map((group) => (
          <li key={group.id}>
            <GroupCard
              group={group}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>
    </HomeSection>
  )
}
