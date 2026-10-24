import { PersonRow } from "@/components/PersonRow/PersonRow"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import {
  GroupMembershipAction,
  hasMembershipAction,
} from "@/features/groups/components/GroupMembershipAction"
import { GroupFacts, GroupHeading } from "@/features/groups/components/GroupSummary"

type GroupProfileProps = {
  group: GroupDetail
  isSignedIn: boolean
  /** Login's `from`, so a visitor who signs in to join comes back to the group. */
  signInFrom: string
}

/**
 * The group page: activity, name, locality, type, approved members, admins
 * and description. Mobile (Figma A-08) stacks them with the action in a bar
 * above the bottom navigation; desktop (A-08d, like the event detail A-05d)
 * puts the facts and the action in a panel on the right. The group's
 * events come with #70.
 */
export function GroupProfile({ group, isSignedIn, signInFrom }: GroupProfileProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const action = hasMembershipAction(group) ? (
    <GroupMembershipAction
      group={group}
      isSignedIn={isSignedIn}
      signInFrom={signInFrom}
    />
  ) : null

  if (isDesktop) {
    return (
      <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-12">
        <div className="flex flex-col gap-6">
          <GroupHeading group={group} />
          <GroupAbout description={group.description} />
          <GroupAdmins admins={group.admins} />
        </div>
        {/* Figma: Panel skupiny */}
        <div className="flex w-100 flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground">
          <GroupFacts group={group} />
          {action}
        </div>
      </article>
    )
  }

  return (
    <article className="flex flex-col gap-5">
      <GroupHeading group={group} />
      <GroupFacts group={group} />
      <GroupAdmins admins={group.admins} />
      <GroupAbout description={group.description} />
      {action ? (
        // Figma: Lišta s akcí — above the bottom navigation
        <div className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-3">
          {action}
        </div>
      ) : null}
    </article>
  )
}

function GroupAdmins({ admins }: { admins: GroupDetail["admins"] }) {
  return (
    <section
      aria-labelledby="group-admins"
      className="flex flex-col gap-1"
    >
      <h2
        id="group-admins"
        className="text-xs font-medium text-muted-foreground"
      >
        Spravuje
      </h2>
      <ul>
        {admins.map((admin) => (
          <li
            key={admin.id}
            // Figma: Person row ends with a hairline
            className="border-b border-border py-3"
          >
            <PersonRow
              name={admin.name}
              description="Správce skupiny"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function GroupAbout({ description }: { description: string | null }) {
  if (!description) return null
  return (
    <section
      aria-labelledby="group-about"
      className="flex flex-col gap-2"
    >
      <h2
        id="group-about"
        className="text-lg font-semibold tracking-tight"
      >
        O skupině
      </h2>
      <p className="text-base whitespace-pre-line">{description}</p>
    </section>
  )
}
