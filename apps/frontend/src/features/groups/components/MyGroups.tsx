import { useId, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Info, RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { GROUP_GRID, GroupCardSkeleton } from "@/features/groups/components/GroupList"
import { useMyGroups } from "@/features/groups/hooks/useMyGroups"
import {
  MY_GROUP_TYPE,
  membershipRequestsSummary,
  runningFacts,
} from "@/features/groups/lib/myGroups"

/**
 * Moje › Skupiny › Jsem členem (Figma C-04, C-04d; #304), as Přihlášen in Moje › Akce: my
 * requests waiting for an admin on top, with the same badge as a request for an event, then
 * the groups I am a member of. A card opens the group's page.
 */
export function MemberGroups({ viewerId }: { viewerId: string }) {
  const { sections, error, retry } = useMyGroups(viewerId)
  if (error) return <MyGroupsError onRetry={retry} />
  if (!sections) return <MyGroupsLoading />

  const { pending, joined } = sections
  return (
    <div className="flex flex-col gap-6">
      {pending.length + joined.length === 0 ? (
        <MyGroupsEmpty>
          <p>Zatím nejsi v žádné skupině. Najdi partu, se kterou se budete potkávat pravidelně.</p>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.groups}>Projít všechny skupiny</Link>
          </Button>
        </MyGroupsEmpty>
      ) : null}
      <MyGroupsSection
        title="Čeká na schválení"
        groups={pending}
      />
      <MyGroupsSection
        title="Jsem členem"
        groups={joined}
      />
    </div>
  )
}

/**
 * Moje › Skupiny › Spravuju (Figma C-05, C-05d; #304), as Pořádám in Moje › Akce: the strip
 * on top sums up the requests to decide, a card says how many wait and opens the group's
 * management, where they are decided as an event's requests. „Založit skupinu“ is the page's.
 */
export function RunningGroups({ viewerId }: { viewerId: string }) {
  const { groups, sections, error, retry } = useMyGroups(viewerId)
  if (error) return <MyGroupsError onRetry={retry} />
  if (!groups || !sections) return <MyGroupsLoading />

  const summary = membershipRequestsSummary(sections.running)
  return (
    <div className="flex flex-col gap-6">
      {sections.running.length === 0 ? (
        // Hlas aplikace; „Založit skupinu“ is right there, in the band or floating
        <MyGroupsEmpty>
          <p>Zatím nespravuješ žádnou skupinu. Založ ji a parta se bude potkávat pravidelně.</p>
        </MyGroupsEmpty>
      ) : null}
      {summary ? (
        <Alert
          variant="info"
          role="status"
        >
          <Info />
          <AlertTitle>{summary.title}</AlertTitle>
          <AlertDescription>{summary.groups}</AlertDescription>
        </Alert>
      ) : null}
      <MyGroupsSection
        title="Spravuju"
        groups={sections.running}
      />
    </div>
  )
}

/** A section of my groups, left out while empty (C-04, C-05). */
function MyGroupsSection({ title, groups }: { title: string; groups: MyGroup[] }) {
  const headingId = useId()
  if (groups.length === 0) return null
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 md:gap-4"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        {`${title} (${groups.length})`}
      </h2>
      <ul className={GROUP_GRID}>
        {groups.map((group) => {
          const isRunning = group.membership.role === "admin" && group.membership.status === "active"
          return (
            <li key={group.id}>
              <GroupCard
                group={group}
                typeLabel={MY_GROUP_TYPE[group.type]}
                facts={isRunning ? runningFacts(group) : undefined}
                isRequestPending={group.membership.status === "pending"}
                linkTo={isRunning ? "manage" : "page"}
                titleAs="h3"
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** The cards' places while my groups load. */
export function MyGroupsLoading() {
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

function MyGroupsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Skupiny se nepodařilo načíst</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>Zkontroluj připojení a zkus to znovu.</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" />
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function MyGroupsEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
