import { Link, useCanGoBack, useLocation, useRouter, type LinkProps } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { backLabel, previousPath } from "@/components/BackLink/backTarget"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type BackLinkProps = Pick<LinkProps, "to" | "params"> & {
  /** The label when there is no history, e.g. „Všechny akce“ for `to` = the list. */
  fallbackLabel: string
  /**
   * The label for `to` where Figma names it (e.g. „Skupiny“), used when the link leads there
   * — with no history to go back in.
   */
  label?: string
  /** Only the arrow on a phone (Figma Header/Sub); the label stays the link's name. */
  isIconOnlyOnMobile?: boolean
}

/**
 * Back to where the user came from — a list keeps its filters in the URL, so they come back
 * too — and named after that page („Moje akce“, „Akce“…; N9, #187), or „Zpět“ where it isn't
 * known. A shared link has nowhere to go back to and leads to `to` instead.
 */
export function BackLink({
  to,
  params,
  fallbackLabel,
  label,
  isIconOnlyOnMobile = false,
}: BackLinkProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const index = useLocation({ select: (location) => location.state.__TSR_index })

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn("-ml-3 w-fit", isIconOnlyOnMobile && "size-10 md:h-8 md:w-fit")}
    >
      <Link
        to={to}
        params={params}
        onClick={(e) => {
          if (!canGoBack) return
          e.preventDefault()
          router.history.back()
        }}
      >
        <ArrowLeft />
        <span className={cn(isIconOnlyOnMobile && "sr-only md:not-sr-only")}>
          {canGoBack ? (backLabel(previousPath(index)) ?? "Zpět") : (label ?? fallbackLabel)}
        </span>
      </Link>
    </Button>
  )
}
