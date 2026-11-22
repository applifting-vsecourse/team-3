import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Bell } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { unreadCountQueryOptions } from "@/features/notifications/api/notificationsQueryOptions"
import { MarkAllReadButton } from "@/features/notifications/components/MarkAllReadButton"
import { NotificationList } from "@/features/notifications/components/NotificationList"
import { bellLabel, unreadBadge } from "@/features/notifications/lib/notifications"

/**
 * The bell in the header (#86, Figma Zvonek, C-07b, C-07d): the number of unread upozornění in
 * the lime badge, „9+“ over 9. On a phone it leads to /upozorneni (C-07); on desktop it opens
 * the panel under it. The number is asked for every minute and on returning to the tab.
 */
export function NotificationBell({ viewerId }: { viewerId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const count = useQuery(unreadCountQueryOptions(viewerId)).data ?? 0
  const label = bellLabel(count)
  const badge = unreadBadge(count)
  const icon = (
    <span className="relative inline-flex">
      <Bell
        className="size-5.5"
        aria-hidden
      />
      {badge ? (
        <span
          aria-hidden
          className="absolute -top-2 left-2.5 h-4.5 min-w-4.5 rounded-full bg-primary px-1 text-center text-[11px] leading-4.5 font-semibold text-primary-foreground ring-2 ring-hero"
        >
          {badge}
        </span>
      ) : null}
    </span>
  )

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="icon-lg"
        className="rounded-full text-on-hero md:hidden"
      >
        <Link
          to={ROUTES.notifications}
          aria-label={label}
        >
          {icon}
        </Link>
      </Button>
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={label}
            className="hidden rounded-full text-on-hero md:inline-flex"
          >
            {icon}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          // Figma C-07d: the kit's popover = card, with card-border and rounded-2xl
          className="flex max-h-[min(70vh,560px)] w-100 flex-col rounded-2xl border-card-border p-0"
        >
          <div className="flex items-center justify-between gap-2 pt-3 pr-2 pb-1 pl-4">
            <h2 className="text-base font-semibold">Upozornění</h2>
            {count > 0 ? <MarkAllReadButton label="Označit vše jako přečtené" /> : null}
          </div>
          <div className="min-h-0 overflow-y-auto px-4 pb-2">
            {/* the list loads when the panel opens, not with every page */}
            {isOpen ? (
              <NotificationList
                viewerId={viewerId}
                onNavigate={() => setIsOpen(false)}
              />
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
