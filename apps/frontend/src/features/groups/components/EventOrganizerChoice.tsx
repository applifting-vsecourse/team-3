import { Link } from "@tanstack/react-router"
import { User, Users } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { useMyGroups } from "@/features/groups/hooks/useMyGroups"

type EventOrganizerChoiceProps = {
  viewerId: string
  /** The group the form creates the event for; null for one's own event. */
  groupId: string | null
}

/**
 * „Pořádá“ above the event form (PO 26. 11.: „Při vytváření akce nemůžu založit akci pod
 * skupinou a nemohu si v tom případě vybrat, jestli je private nebo public“): an admin of a
 * group picks who organizes — themselves or the group, whose form asks who may see it
 * (public / members, #70). Only for who runs at least one active group; nobody else has a
 * choice. Links, so each form keeps its own address and the back button.
 */
export function EventOrganizerChoice({ viewerId, groupId }: EventOrganizerChoiceProps) {
  const { sections } = useMyGroups(viewerId)
  const running = sections?.running ?? []
  if (running.length === 0) return null
  return (
    <nav
      aria-label="Kdo akci pořádá"
      className="flex flex-col gap-2"
    >
      <p className="text-sm leading-none font-medium">Pořádá</p>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Button
            asChild
            variant={groupId === null ? "default" : "outline"}
            className="h-10"
          >
            <Link
              to={ROUTES.newEvent}
              aria-current={groupId === null ? "page" : undefined}
            >
              <User aria-hidden />
              Já
            </Link>
          </Button>
        </li>
        {running.map((group) => (
          <li key={group.id}>
            <Button
              asChild
              variant={groupId === group.id ? "default" : "outline"}
              className="h-10"
            >
              <Link
                to="/skupiny/$groupId/akce/nova"
                params={{ groupId: group.id }}
                aria-current={groupId === group.id ? "page" : undefined}
              >
                <Users aria-hidden />
                {group.name}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Akce skupiny může být veřejná, nebo jen pro členy.
      </p>
    </nav>
  )
}
