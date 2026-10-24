import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import type { Group } from "@/features/groups/api/groupSchemas"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { groupCountLabel } from "@/features/groups/lib/formatGroup"

// Figma A-07d: three columns on a wide desktop, one on mobile
export const GROUP_GRID = "grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3"

type GroupListProps = {
  groups: Group[]
  isLoading?: boolean
  error?: Error
  onRetry?: () => void
  /** An activity is picked, so an empty list is about the filters, not just the place. */
  hasActivityFilter?: boolean
}

/** The list of /skupiny (Figma A-07, A-07d) with its loading, empty and error states. */
export function GroupList({
  groups,
  isLoading,
  error,
  onRetry,
  hasActivityFilter,
}: GroupListProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Skupiny se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          {/* ky's message is a URL and a status code; it stays in the console */}
          <span>Zkontroluj připojení a zkus to znovu.</span>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              <RefreshCw className="size-4" />
              Zkusit znovu
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div
        className={GROUP_GRID}
        aria-busy
        aria-label="Načítám skupiny"
      >
        {[0, 1, 2, 3].map((i) => (
          <GroupCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold">{groupCountLabel(groups.length)}</p>
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {hasActivityFilter
            ? "Pro zvolené filtry zatím žádná skupina není."
            : "V této lokalitě zatím žádná skupina není."}
        </p>
      ) : (
        <ul className={GROUP_GRID}>
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function GroupCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Skeleton className="size-16 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
