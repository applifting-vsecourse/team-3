import { PersonRow } from "@/components/PersonRow/PersonRow"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GroupCard } from "@/features/groups/components/GroupCard"

/**
 * Figma A-05g, „Pořádá“ on the detail of a group's event (#70): the group's
 * card, linking to its page, and under it who runs the group.
 */
export function GroupOrganizer({ group }: { group: GroupDetail }) {
  return (
    <>
      <GroupCard
        group={group}
        titleAs="h3"
      />
      <ul>
        {group.admins.map((admin) => (
          <li
            key={admin.id}
            // Figma: Person row ends with a hairline
            className="border-b border-border py-3"
          >
            <PersonRow
              name={admin.name}
              userId={admin.id}
              description="Správce skupiny"
            />
          </li>
        ))}
      </ul>
    </>
  )
}
