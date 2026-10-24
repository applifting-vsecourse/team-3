import { useId } from "react"
import { RefreshCw } from "lucide-react"

import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { EventParticipant } from "@/features/events/api/eventSchemas"

type ManagedParticipantsProps = {
  /** undefined until they load */
  participants: EventParticipant[] | undefined
  error: Error | undefined
  onRetry: () => void
  /** Inside a tab the tab names the list: the heading stays for screen readers only. */
  isHeadingHidden?: boolean
}

/**
 * Who is coming, on the organizer's management page (Figma D-03, #43), in
 * the order they got their place. Waiting requests are ManagedRequests
 * (#53), removing someone is #60.
 */
export function ManagedParticipants({
  participants,
  error,
  onRetry,
  isHeadingHidden = false,
}: ManagedParticipantsProps) {
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
        Účastníci{" "}
        {participants ? (
          <span className="font-normal text-muted-foreground">{participants.length}</span>
        ) : null}
      </h2>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Účastníky se nepodařilo načíst</AlertTitle>
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
      ) : !participants ? (
        <div
          aria-busy
          aria-label="Načítám účastníky"
          className="flex flex-col gap-3"
        >
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3"
            >
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : participants.length === 0 ? (
        <p className="text-muted-foreground">Až se někdo přihlásí, uvidíš ho tady.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {participants.map((participant) => (
            <li key={participant.id}>
              <PersonRow name={participant.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
