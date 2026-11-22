import { useEffect, type MouseEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Bell } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import {
  notificationKeys,
  notificationListQueryOptions,
} from "@/features/notifications/api/notificationsQueryOptions"
import type { AppNotification } from "@/features/notifications/api/notificationsSchemas"
import { useMarkNotificationRead } from "@/features/notifications/hooks/useNotificationMutations"
import { notificationTime } from "@/features/notifications/lib/notifications"

type NotificationListProps = {
  viewerId: string
  /** After a click on one, before it leads on: the panel closes (C-07d). */
  onNavigate?: () => void
}

/**
 * The upozornění (#86, Figma C-07, C-07d, Upozornění/Řádek): newest first, the unread with a
 * dot and bold text (colour alone is not enough). Each is a link to its detail and opening it
 * marks it read. Loading, empty and error, as every list (DESIGN.md).
 */
export function NotificationList({ viewerId, onNavigate }: NotificationListProps) {
  const query = useQuery(notificationListQueryOptions(viewerId))
  const queryClient = useQueryClient()
  const unreadCount = query.data?.unreadCount
  // the bell asks once a minute; the list's own count is fresher, so the two agree (review #398)
  useEffect(() => {
    if (unreadCount !== undefined) {
      queryClient.setQueryData(notificationKeys.unreadCount(viewerId), unreadCount)
    }
  }, [queryClient, viewerId, unreadCount])
  const markRead = useMarkNotificationRead()
  const router = useRouter()
  const now = new Date()

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Upozornění se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          Zkontroluj připojení a zkus to znovu.
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (!query.data) {
    return (
      <div
        className="flex flex-col gap-3 py-3"
        aria-busy="true"
        aria-label="Načítám upozornění"
      >
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (query.data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <Bell
          className="size-8 text-muted-foreground"
          aria-hidden
        />
        <p className="text-lg font-semibold">Zatím tu nic není</p>
        <p className="max-w-75 text-sm text-muted-foreground">
          Až se u tvých akcí, skupin nebo přátel něco stane, dáme ti vědět.
        </p>
      </div>
    )
  }

  const open = (event: MouseEvent<HTMLAnchorElement>, item: AppNotification) => {
    // opened, so read — in a new tab or window too (review #398)
    if (!item.readAt) markRead.mutate(item.id)
    // a new tab or window keeps the browser's own handling
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onNavigate?.()
    void router.navigate({ href: item.path })
  }

  return (
    <ul aria-label="Upozornění">
      {query.data.items.map((item) => {
        const isUnread = item.readAt === null
        return (
          <li
            key={item.id}
            className="border-b border-border"
          >
            <a
              href={item.path}
              onClick={(event) => open(event, item)}
              // the middle button opens a new tab without a click event
              onAuxClick={(event) => {
                if (event.button === 1 && !item.readAt) markRead.mutate(item.id)
              }}
              className="-mx-2 flex gap-3 rounded-md px-2 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  isUnread ? "bg-foreground" : "bg-transparent",
                )}
                aria-hidden
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("text-sm", isUnread && "font-semibold")}>
                  {isUnread ? <span className="sr-only">Nepřečtené:</span> : null}
                  {isUnread ? " " : null}
                  {item.text}
                </span>
                {/* a space for the link's name; flex lays it out as nothing */}{" "}
                <time
                  dateTime={item.createdAt.toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  {notificationTime(item.createdAt, now)}
                </time>
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
