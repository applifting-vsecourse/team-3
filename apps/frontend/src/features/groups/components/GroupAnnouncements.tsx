import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { groupAnnouncementsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { formatAnnouncementTime } from "@/features/groups/lib/formatGroup"

type GroupAnnouncementsProps = {
  groupId: string
  /** The signed-in member; the page renders this only for an active member or admin. */
  viewerId: string
}

/**
 * „Oznámení“ on the group page (#194, Figma A-08e, A-08ed): what the admins
 * announced, newest first, each as it came by e-mail — who and when, the
 * subject and the text as they wrote it. Only for members and admins.
 */
export function GroupAnnouncements({ groupId, viewerId }: GroupAnnouncementsProps) {
  const headingId = useId()
  const query = useQuery(groupAnnouncementsQueryOptions(groupId, viewerId))
  const announcements = query.data?.announcements

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight"
      >
        {announcements?.length ? `Oznámení (${announcements.length})` : "Oznámení"}
      </h2>
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Oznámení se nepodařilo načíst</AlertTitle>
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
      ) : !announcements ? (
        <div
          className="flex flex-col gap-2 border-t border-border pt-3"
          aria-busy
          aria-label="Načítám oznámení"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-muted-foreground">
          Zatím tu žádné oznámení není. Až správce skupiny něco napíše, uvidíš to tady a přijde ti
          to e-mailem.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              // Figma: each announcement starts with a hairline
              className="flex flex-col gap-1 border-t border-border pt-3"
            >
              <p className="text-sm text-muted-foreground">
                {announcement.sender.name} ·{" "}
                <time dateTime={announcement.createdAt.toISOString()}>
                  {formatAnnouncementTime(announcement.createdAt)}
                </time>
              </p>
              <h3 className="text-sm font-semibold">{announcement.subject}</h3>
              <p className="text-body whitespace-pre-line">{announcement.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
