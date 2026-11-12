import type { ReactNode } from "react"

import { BackLink, type BackLinkProps } from "@/components/BackLink/BackLink"

type SubBarProps = {
  back: Omit<BackLinkProps, "isIconOnlyOnMobile">
  /** What the page is („Detail akce“, „Skupina“); the H1 is in the band below. */
  label: string
  /** On the right, e.g. „Sdílet“. */
  action?: ReactNode
  /** A page without a band on a phone (the management, D-03): the label is its H1. */
  isHeading?: boolean
}

/**
 * A detail's bar on a phone (Figma Header/Sub): the arrow, what the page is and its action,
 * on the band's colour; the photo and the band with the title follow (A-05, A-08). It takes the
 * header's place: the header steps aside while a bar is on the page (`Header`), and the bar stays
 * at the top as the header would.
 */
export function SubBar({ back, label, action, isHeading = false }: SubBarProps) {
  const Label = isHeading ? "h1" : "p"
  return (
    <div
      data-slot="sub-bar"
      className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-hero on-hero pr-2 pl-4"
    >
      <BackLink
        {...back}
        isIconOnlyOnMobile
      />
      <Label className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</Label>
      {action}
    </div>
  )
}
