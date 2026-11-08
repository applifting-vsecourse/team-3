import { Link, useCanGoBack, useRouter, type LinkProps } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type BackLinkProps = Pick<LinkProps, "to" | "params"> & {
  /** The label when there is no history, e.g. „Všechny akce“ for `to` = the list. */
  fallbackLabel: string
  /** A fixed label instead of „Zpět“ / `fallbackLabel`, where Figma names it (e.g. „Skupiny“). */
  label?: string
  /** Only the arrow on a phone (Figma Header/Sub); the label stays the link's name. */
  isIconOnlyOnMobile?: boolean
}

/**
 * Back to where the user came from — a list keeps its filters in the URL,
 * so they come back too. A shared link has nowhere to go back to and leads to
 * the list instead.
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
          {label ?? (canGoBack ? "Zpět" : fallbackLabel)}
        </span>
      </Link>
    </Button>
  )
}
