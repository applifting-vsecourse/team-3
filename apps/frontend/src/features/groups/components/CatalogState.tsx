import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type CatalogStateProps = {
  /** Queries the form waits for (the catalog, and the group when editing). */
  queries: readonly { error: Error | null; refetch: () => unknown }[]
  errorTitle?: string
}

/** What a group page shows until its data (the catalog, the group) has loaded, or why it couldn't. */
export function CatalogState({
  queries,
  errorTitle = "Formulář se nepodařilo načíst",
}: CatalogStateProps) {
  if (queries.some((query) => query.error)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>Zkontroluj připojení a zkus to znovu.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              for (const query of queries) if (query.error) void query.refetch()
            }}
          >
            <RefreshCw className="size-4" />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy
      aria-label="Načítám"
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  )
}
