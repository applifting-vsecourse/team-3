import { useId } from "react"
import { Check, RefreshCw, X } from "lucide-react"

import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { EventRequest } from "@/features/events/api/eventSchemas"
import { formatRequestTime } from "@/features/events/lib/formatEvent"

type ManagedRequestsProps = {
  /** undefined until they load */
  requests: EventRequest[] | undefined
  error: Error | undefined
  onRetry: () => void
  /** Inside a tab the tab names the list: the heading stays for screen readers only. */
  isHeadingHidden?: boolean
  /** No place left: approving waits until someone leaves; rejecting still works. */
  isFull: boolean
  /** The request being approved or rejected right now; only its row waits. */
  decidingId: string | undefined
  onDecide: (request: EventRequest, decision: "approve" | "reject") => void
}

/**
 * Requests waiting for the organizer (Figma D-03, #53), oldest first, each
 * approved or rejected on its own (bulk is #60). Same buttons as the
 * group's requests (D-07).
 */
export function ManagedRequests({
  requests,
  error,
  onRetry,
  isHeadingHidden = false,
  isFull,
  decidingId,
  onDecide,
}: ManagedRequestsProps) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className={cn("text-lg font-semibold tracking-tight", isHeadingHidden && "sr-only")}
      >
        Žádosti{" "}
        {requests ? (
          <span className="font-normal text-muted-foreground">{requests.length}</span>
        ) : null}
      </h2>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Žádosti se nepodařilo načíst</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            {/* ky's message is a URL and a status code; it stays in the console */}
            <span>Zkontrolujte připojení a zkuste to znovu.</span>
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
      ) : !requests ? (
        <div
          aria-busy
          aria-label="Načítám žádosti"
          className="flex flex-col gap-3"
        >
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3"
            >
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground">Žádné žádosti o účast teď nečekají.</p>
      ) : (
        <>
          {isFull ? (
            <p className="text-sm text-muted-foreground">
              Akce je plná. Schválit půjde, až se uvolní místo.
            </p>
          ) : null}
          <ul className="flex flex-col">
            {requests.map((request) => {
              const isDeciding = decidingId === request.id
              return (
                <li
                  key={request.id}
                  className="border-b border-border py-3 last:border-b-0"
                >
                  <PersonRow
                    name={request.name}
                    description={formatRequestTime(request.requestedAt)}
                    actions={
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-11"
                          disabled={isDeciding}
                          aria-label={`Zamítnout žádost: ${request.name}`}
                          onClick={() => onDecide(request, "reject")}
                        >
                          <X />
                          Zamítnout
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-11"
                          disabled={isDeciding || isFull}
                          aria-label={`Schválit žádost: ${request.name}`}
                          onClick={() => onDecide(request, "approve")}
                        >
                          <Check />
                          Schválit
                        </Button>
                      </>
                    }
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
