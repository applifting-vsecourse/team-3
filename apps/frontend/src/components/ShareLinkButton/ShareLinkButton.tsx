import type { ComponentType } from "react"
import { Share } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/** The page's full address, for sharing or copying. */
export function absoluteLink(path: string): string {
  return new URL(path, window.location.origin).href
}

type ShareLinkButtonProps = {
  /** The page shared, e.g. `/akce/abc` — built by the caller, never the current URL. */
  path: string
  /** The title the phone's share sheet shows. */
  title: string
  label: string
  /** The phone's own share sheet where there is one; otherwise the link is copied. */
  shouldUseShareSheet?: boolean
  /** By default a quiet ghost in a bar (with the share sheet), an outline elsewhere. */
  variant?: "default" | "outline" | "ghost"
  icon?: ComponentType
  className?: string
}

/**
 * Shares a page's link (Figma A-05, D-03, D-07; #371): the share sheet on a phone, or copies
 * it with a toast. Event and group sharing use it, and „Kopírovat odkaz“ under an empty list.
 */
export function ShareLinkButton({
  path,
  title,
  label,
  shouldUseShareSheet = false,
  variant,
  icon: Icon = Share,
  className,
}: ShareLinkButtonProps) {
  const share = async () => {
    const url = absoluteLink(path)
    if (shouldUseShareSheet && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
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

  const isBarButton = shouldUseShareSheet && variant === undefined
  return (
    <Button
      variant={variant ?? (isBarButton ? "ghost" : "outline")}
      size={isBarButton ? "sm" : "lg"}
      className={className}
      onClick={() => void share()}
    >
      <Icon />
      {label}
    </Button>
  )
}
