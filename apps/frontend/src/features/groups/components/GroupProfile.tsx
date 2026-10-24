import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Lock, MapPin, Pencil, Users } from "lucide-react"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { GROUP_TYPE_LONG, memberCountLabel } from "@/features/groups/lib/formatGroup"

type GroupProfileProps = {
  group: GroupDetail
  /** The viewer is one of its admins, so the page offers editing. */
  isAdmin: boolean
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("cs"))
    .join("")

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

      <ul className="flex flex-col gap-3">
        <DetailRow
          icon={<MapPin className="size-5" />}
          label="Lokalita"
        >
          {group.locality.name}
        </DetailRow>
        <DetailRow
          icon={
            group.type === "closed" ? <Lock className="size-5" /> : <Users className="size-5" />
          }
          label="Typ skupiny"
        >
          {GROUP_TYPE_LONG[group.type]}
        </DetailRow>
        <DetailRow
          icon={<Users className="size-5" />}
          label="Členové"
        >
          {memberCountLabel(group.memberCount)}
        </DetailRow>
      </ul>

      <section
        aria-labelledby="group-admins"
        className="flex flex-col gap-2"
      >
        <h2
          id="group-admins"
          className="text-xs font-medium text-muted-foreground"
        >
          Spravuje
        </h2>
        <ul className="flex flex-col gap-3">
          {group.admins.map((admin) => (
            <li
              key={admin.id}
              className="flex items-center gap-3"
            >
              <Avatar className="size-10">
                <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
                  {initials(admin.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{admin.name}</span>
                <span className="text-sm text-muted-foreground">Správce skupiny</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {group.description ? (
        <section
          aria-labelledby="group-about"
          className="flex flex-col gap-2 border-t border-border pt-6"
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
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full md:w-auto md:self-start"
        >
          <Link
            to="/skupiny/$groupId/upravit"
            params={{ groupId: group.id }}
          >
            <Pencil />
            Upravit skupinu
          </Link>
        </Button>
      ) : null}
    </article>
  )
}

/** Figma: Detail row */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground"
      >
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-base">{children}</span>
      </div>
    </li>
  )
}
