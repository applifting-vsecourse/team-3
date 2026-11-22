import { useQuery } from "@tanstack/react-query"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { SubBar } from "@/components/PageBand/SubBar"
import { Seo } from "@/components/Seo"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { unreadCountQueryOptions } from "@/features/notifications/api/notificationsQueryOptions"
import { MarkAllReadButton } from "@/features/notifications/components/MarkAllReadButton"
import { NotificationList } from "@/features/notifications/components/NotificationList"

const back = { to: ROUTES.home, fallbackLabel: "Zpět" } as const

/**
 * /upozorneni (#86, Figma C-07, C-07a): where the bell leads on a phone. On a phone the bar
 * with the arrow, „Upozornění“ and „Označit vše“ (Header/Sub); on desktop, where the bell opens
 * a panel instead, the page has the band like any page under a section.
 */
export function NotificationsPage({ viewerId }: { viewerId: string }) {
  const unread = useQuery(unreadCountQueryOptions(viewerId)).data ?? 0
  return (
    <>
      <Seo title="Upozornění" />
      <div className="md:hidden">
        <SubBar
          back={back}
          label="Upozornění"
          isHeading
          action={
            unread > 0 ? (
              <MarkAllReadButton
                label="Označit vše"
                hasIcon
                className="text-on-hero"
              />
            ) : undefined
          }
        />
      </div>
      <div className="hidden md:block">
        <PageBand
          title="Upozornění"
          back={back}
          action={unread > 0 ? <MarkAllReadButton label="Označit vše jako přečtené" /> : undefined}
        />
      </div>
      <div className={cn(PAGE, "pb-24")}>
        {/* a line of text reads in a column, aligned with the band's title */}
        <div className="w-full max-w-180">
          <NotificationList viewerId={viewerId} />
        </div>
      </div>
    </>
  )
}
