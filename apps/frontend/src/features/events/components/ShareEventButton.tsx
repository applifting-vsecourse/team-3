import { ROUTES } from "@/app/routes"
import { ShareLinkButton } from "@/components/ShareLinkButton/ShareLinkButton"

type ShareEventButtonProps = {
  /** The event whose detail is shared — from any page, the management too (review #269). */
  event: { id: string; title: string }
  /** „Sdílet odkaz“ in the desktop panel (A-05d), „Sdílet“ at the top on a phone (A-05). */
  label: string
  /** The phone's own share sheet where there is one; otherwise the link is copied. */
  shouldUseShareSheet?: boolean
  /** The management's next step makes it the primary button (#371). */
  variant?: "default" | "outline" | "ghost"
  className?: string
}

/** The detail's path, shared and copied (A-05, D-03d). */
export function eventDetailPath(eventId: string): string {
  return ROUTES.eventDetail.replace("$eventId", encodeURIComponent(eventId))
}

/**
 * Shares the event's detail (Figma A-05, A-05d, D-03): a shared link opens straight on the
 * detail, even without an account (US-03). Built from the event, not the page's URL — on the
 * management that would send the group a page only the organizer can use.
 */
export function ShareEventButton({
  event,
  label,
  shouldUseShareSheet = false,
  variant,
  className,
}: ShareEventButtonProps) {
  return (
    <ShareLinkButton
      path={eventDetailPath(event.id)}
      title={event.title}
      label={label}
      shouldUseShareSheet={shouldUseShareSheet}
      variant={variant}
      className={className}
    />
  )
}
