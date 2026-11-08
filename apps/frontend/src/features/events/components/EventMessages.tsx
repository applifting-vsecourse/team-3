import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { eventMessagesQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { formatMessageTime } from "@/features/events/lib/formatEvent"

type EventMessagesProps = {
  eventId: string
  /** The signed-in viewer; the page renders this only when the API sent the names (#174). */
  viewerId: string
  /** The organizer writes the messages, so the empty state tells them where. */
  isOrganizer?: boolean
}

/**
 * „Zprávy od organizátora“ on the event's detail (#176, Figma A-05c, A-05c
 * desktop): what the organizer wrote to the participants, newest first, each
 * as it came by e-mail — who and when, the subject and the text as written.
 * Only for those who see „Kdo jde“; the API decides (#174).
 */
export function EventMessages({ eventId, viewerId, isOrganizer = false }: EventMessagesProps) {
  const headingId = useId()
  const query = useQuery(eventMessagesQueryOptions(eventId, viewerId))
  const messages = query.data?.messages
  // the list holds the latest 50, the heading counts them all
  const total = query.data?.total

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="type-card-heading"
      >
        {total ? `Zprávy od organizátora (${total})` : "Zprávy od organizátora"}
      </h2>
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Zprávy se nepodařilo načíst</AlertTitle>
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
      ) : !messages ? (
        <div
          className="flex flex-col gap-2 border-t border-border pt-3"
          aria-busy
          aria-label="Načítám zprávy"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground">
          {isOrganizer
            ? "Zatím tu žádná zpráva není. Účastníkům napíšeš přes „Napsat účastníkům“ ve správě akce."
            : "Zatím tu žádná zpráva není. Až organizátor něco napíše, uvidíš to tady a přijde ti to e-mailem."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {messages.map((message) => (
            <li
              key={message.id}
              // Figma: each message starts with a hairline
              className="flex flex-col gap-1 border-t border-border py-3"
            >
              <p className="text-sm text-muted-foreground">
                {message.sender.name} ·{" "}
                <time dateTime={message.createdAt.toISOString()}>
                  {formatMessageTime(message.createdAt)}
                </time>
              </p>
              <h3 className="text-sm font-semibold">{message.subject}</h3>
              <p className="text-body whitespace-pre-line">{message.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
