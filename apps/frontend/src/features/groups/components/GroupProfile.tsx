import { Link } from "@tanstack/react-router"
import { Lock, MapPin, Users } from "lucide-react"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { DetailRow } from "@/components/DetailRow/DetailRow"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Button } from "@/components/ui/button"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GROUP_TYPE_LONG, memberCountLabel } from "@/features/groups/lib/formatGroup"

type GroupProfileProps = {
  group: GroupDetail
  /** The viewer is one of its admins, so the page leads to the group's management. */
  isAdmin: boolean
}

/**
 * The group page (Figma A-08): activity, name, locality, type, approved
 * members, admins and description. Membership (#46) and the group's
 * events (#70) come later.
 */
export function GroupProfile({ group, isAdmin }: GroupProfileProps) {
  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ActivityTile icon={group.activity.category.icon} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{group.activity.name}</span>
          <span className="text-sm text-muted-foreground">{group.activity.category.name}</span>
        </div>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>

      <dl className="flex flex-col gap-3">
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
          {GROUP_TYPE_LONG[group.type]}
        </DetailRow>
        <DetailRow
          icon={Users}
          label="Členové"
        >
          {memberCountLabel(group.memberCount)}
        </DetailRow>
      </dl>

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
          {group.admins.map((admin) => (
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

      {group.description ? (
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
          <p className="text-base whitespace-pre-line">{group.description}</p>
        </section>
      ) : null}

      {isAdmin ? (
        // Figma: Lišta s akcí — above the bottom navigation on mobile, in the flow on desktop
        <div className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <Button
            asChild
            size="lg"
            className="w-full md:w-auto"
          >
            <Link
              to="/skupiny/$groupId/sprava"
              params={{ groupId: group.id }}
            >
              Spravovat skupinu
            </Link>
          </Button>
        </div>
      ) : null}
    </article>
  )
}
