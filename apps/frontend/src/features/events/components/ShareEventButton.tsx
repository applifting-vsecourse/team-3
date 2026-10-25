import { Share } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ShareEventButtonProps = {
  /** „Sdílet odkaz“ in the desktop panel (A-05d), „Sdílet“ at the top on a phone (A-05). */
  label: string
  /** The phone's own share sheet where there is one; otherwise the link is copied. */
  shouldUseShareSheet?: boolean
  className?: string
}

/**
 * Shares the detail's URL (Figma A-05, A-05d): a shared link opens straight on
 * the detail, even without an account (US-03).
 */
export function ShareEventButton({
  label,
  shouldUseShareSheet = false,
  className,
}: ShareEventButtonProps) {
  const share = async () => {
    const url = window.location.href
    if (shouldUseShareSheet && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, url })
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
