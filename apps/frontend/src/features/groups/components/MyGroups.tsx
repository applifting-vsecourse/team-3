import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { GROUP_GRID, GroupCardSkeleton } from "@/features/groups/components/GroupList"
import { myGroupTypeLabel } from "@/features/groups/lib/formatGroup"

/**
 * „Moje“ on /skupiny (Figma A-07m, A-07md; B-056): my requests waiting for
 * approval on top, then the groups I run and the groups I am a member of,
 * like Moje akce (C-01). No filters here, all my groups show. A group I run
 * opens its management.
 */
export function MyGroups({ viewerId }: { viewerId: string }) {
  const query = useQuery(myGroupsQueryOptions(viewerId))

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Skupiny se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>Zkontroluj připojení a zkus to znovu.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!query.data) {
    return (
      <div
        className={GROUP_GRID}
        aria-busy
        aria-label="Načítám moje skupiny"
      >
        {[0, 1, 2].map((i) => (
          <GroupCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const pending = query.data.filter((group) => group.membership.status === "pending")
  const active = query.data.filter((group) => group.membership.status === "active")
  const running = active.filter((group) => group.membership.role === "admin")
  const joined = active.filter((group) => group.membership.role === "member")

  if (query.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center text-sm text-muted-foreground">
        <p>Zatím nejsi v žádné skupině.</p>
        <Button
          asChild
          variant="outline"
        >
          <Link to={ROUTES.groups}>Projít všechny skupiny</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 ? (
        <MyGroupsSection
          title={`Čeká na schválení (${pending.length})`}
          groups={pending}
        />
      ) : null}
      {running.length > 0 ? (
        <MyGroupsSection
          title={`Spravuju (${running.length})`}
          groups={running}
        />
      ) : null}
      {joined.length > 0 ? (
        <MyGroupsSection
          title={`Jsem členem (${joined.length})`}
          groups={joined}
        />
      ) : null}
    </div>
  )
}

function MyGroupsSection({ title, groups }: { title: string; groups: MyGroup[] }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight"
      >
        {title}
      </h2>
      <ul className={GROUP_GRID}>
        {groups.map((group) => (
          <li key={group.id}>
            <GroupCard
              group={group}
              typeLabel={myGroupTypeLabel(group)}
              linkTo={
                group.membership.role === "admin" && group.membership.status === "active"
                  ? "manage"
                  : "page"
              }
              titleAs="h3"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
