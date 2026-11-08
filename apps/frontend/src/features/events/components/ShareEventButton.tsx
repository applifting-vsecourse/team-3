import { Share } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ShareEventButtonProps = {
  /** The event whose detail is shared — from any page, the management too (review #269). */
  event: { id: string; title: string }
  /** „Sdílet odkaz“ in the desktop panel (A-05d), „Sdílet“ at the top on a phone (A-05). */
  label: string
  /** The phone's own share sheet where there is one; otherwise the link is copied. */
  shouldUseShareSheet?: boolean
  className?: string
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
  className,
}: ShareEventButtonProps) {
  const share = async () => {
    const url = new URL(`/akce/${encodeURIComponent(event.id)}`, window.location.origin).href
    if (shouldUseShareSheet && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: event.title, url })
      } catch {
        // dismissing the share sheet is not an error worth a toast
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Odkaz je zkopírovaný.")
    } catch {
      toast.error("Odkaz se nepodařilo zkopírovat.")
    }
  }

  return (
    <Button
      variant={shouldUseShareSheet ? "ghost" : "outline"}
      size={shouldUseShareSheet ? "sm" : "lg"}
      className={className}
      onClick={() => void share()}
    >
      <Share />
      {label}
    </Button>
  )
}
