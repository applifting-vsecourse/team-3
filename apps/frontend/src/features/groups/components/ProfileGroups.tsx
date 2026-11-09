import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { GROUP_GRID } from "@/features/groups/components/GroupList"
import { myGroupTypeLabel } from "@/features/groups/lib/formatGroup"

/**
 * Moje skupiny on /profil (Figma B-05, #178): my groups from `GET /api/me/groups`
 * with its own three states, as a section of the profile overview.
 */
export function ProfileGroups({ viewerId }: { viewerId: string }) {
  const query = useQuery(myGroupsQueryOptions(viewerId))
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        {/* the one highlighted keyword of a section heading (DESIGN.md › Type) */}
        Moje <span className="highlight-keyword">skupiny</span>
      </h2>
      {query.error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3"
        >
          <p className="text-sm text-destructive">
            Skupiny se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.
          </p>
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Zkusit znovu
          </Button>
        </div>
      ) : !query.data ? (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          Načítám skupiny…
        </p>
      ) : !query.data.length ? (
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <p>Zatím nejsi v žádné skupině.</p>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.groups}>Prohlédnout skupiny</Link>
          </Button>
        </div>
      ) : (
        <ul className={GROUP_GRID}>
          {query.data.map((group) => (
            <li key={group.id}>
              <GroupCard
                group={group}
                titleAs="h3"
                typeLabel={myGroupTypeLabel(group)}
                linkTo={
                  group.membership.role === "admin" && group.membership.status === "active"
                    ? "manage"
                    : "page"
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
