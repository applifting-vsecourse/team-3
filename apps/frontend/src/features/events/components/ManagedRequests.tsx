import { useId, useState } from "react"
import { Check, Loader2, RefreshCw, X } from "lucide-react"

import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  /** False once the event has started: nothing can be decided any more. */
  canDecide: boolean
  /** No place left: approving waits until someone leaves; rejecting still works. */
  isFull: boolean
  /** A decision is on its way: no other is sent before it's back (a second click would only fail). */
  isDeciding: boolean
  /**
   * Resolves once the decision is saved; rejects when it isn't (the page's
   * toast says why), and the rejection dialog stays open to try again.
   */
  onDecide: (request: EventRequest, decision: "approve" | "reject") => Promise<unknown>
}

/**
 * Requests waiting for the organizer (Figma D-03, #53), oldest first, each
 * approved or rejected on its own (bulk is #60), with the applicant's
 * message in quotes (#175). Same buttons as the group's requests (D-07).
 * Rejecting can't be taken back, so it asks first and says what the
 * applicant will see (#185); approving is one click.
 */
export function ManagedRequests({
  requests,
  error,
  onRetry,
  isHeadingHidden = false,
  canDecide,
  isFull,
  isDeciding,
  onDecide,
}: ManagedRequestsProps) {
  const headingId = useId()
  // kept after closing, so the dialog's text doesn't vanish while it fades out
  const [rejecting, setRejecting] = useState<EventRequest | null>(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
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
          {!canDecide ? (
            <p className="text-sm text-muted-foreground">
              Akce už začala, žádosti už vyřídit nejde.
            </p>
          ) : isFull ? (
            <p className="text-sm text-muted-foreground">
              Akce je plná. Schválit půjde, až se uvolní místo.
            </p>
          ) : null}
          <ul className="flex flex-col">
            {requests.map((request) => (
              <li
                key={request.id}
                className="border-b border-border py-3 last:border-b-0"
              >
                <PersonRow
                  name={request.name}
                  description={formatRequestTime(request.requestedAt)}
                  quote={request.message}
                  actions={
                    canDecide ? (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-11"
                          disabled={isDeciding}
                          aria-label={`Zamítnout žádost: ${request.name}`}
                          onClick={() => {
                            setRejecting(request)
                            setIsRejectOpen(true)
                          }}
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
                          onClick={() =>
                            onDecide(request, "approve").catch(() => {
                              // the page's toast says why
                            })
                          }
                        >
                          <Check />
                          Schválit
                        </Button>
                      </>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <Dialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zamítnout žádost?</DialogTitle>
            <DialogDescription>
              {/* what ParticipationAction shows them; no e-mail goes out yet (#177) */}
              {rejecting?.name} uvidí na detailu akce, že žádost byla zamítnuta, a novou na tuhle
              akci už poslat nepůjde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Zpět</Button>
            </DialogClose>
            <Button
              variant="destructive"
              // a second rejection while the first is on its way would only fail
              disabled={isDeciding}
              onClick={async () => {
                if (!rejecting) return
                try {
                  await onDecide(rejecting, "reject")
                  setIsRejectOpen(false)
                } catch {
                  // the page's toast says why; the dialog stays to try again
                }
              }}
            >
              {isDeciding ? <Loader2 className="size-4 animate-spin" /> : null}
              Zamítnout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
