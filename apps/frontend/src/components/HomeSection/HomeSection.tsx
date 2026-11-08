import { useId, type ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { LogoMark } from "@/components/Logo/Logo"
import { cn } from "@/lib/utils"

type SectionHeadingProps = {
  /** The words before the keyword, the keyword and the words after it: „Tady “, „chybíš“. */
  before?: string
  keyword: string
  after?: string
  /** „Tady chybíš“ and „Pro tebe“ start with the logo (Figma A-01d). */
  hasLogo?: boolean
  id: string
}

/**
 * A section heading of the landing page (Figma Display/Title): one highlighted keyword
 * (DESIGN.md › Type), on „Tady chybíš“ after the logo — the group missing one.
 */
export function SectionHeading({ before, keyword, after, hasLogo, id }: SectionHeadingProps) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2.5 type-title md:gap-3.5"
    >
      {hasLogo ? <LogoMark className="size-7.5 md:size-11" /> : null}
      <span>
        {before}
        <span className="highlight-keyword">{keyword}</span>
        {after}
      </span>
    </h2>
  )
}

type HomeSectionProps = {
  heading: Omit<SectionHeadingProps, "id">
  /** The line under the heading (Figma Body/Intro). */
  description: ReactNode
  /** „Zobrazit všechny →“ — /akce with the closest filter. */
  more: MoreLinkProps
  children: ReactNode
  className?: string
}

/**
 * A section of the landing page (Figma A-01, A-01d; DESIGN.md › Type): the heading with its line and the link
 * to the whole list — on desktop beside them, on a phone under the cards.
 */
export function HomeSection({ heading, description, more, children, className }: HomeSectionProps) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-3 md:gap-7", className)}
    >
      <div className="flex items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3 md:gap-2">
          <SectionHeading
            {...heading}
            id={headingId}
          />
          <p className="text-body text-muted-foreground md:type-intro">{description}</p>
        </div>
        <MoreLink
          {...more}
          className="hidden shrink-0 md:inline"
        />
      </div>
      {children}
      <MoreLink
        {...more}
        className="md:hidden"
      />
    </section>
  )
}

type MoreLinkProps = { label: string; link: LinkProps }

/** „Zobrazit všechny →“ (Figma Label/Large): beside the heading on desktop, under the cards on a phone. */
export function MoreLink({ label, link, className }: MoreLinkProps & { className?: string }) {
  return (
    <Link
      {...link}
      className={cn(
        "self-start rounded-lg text-body font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
    >
      {label} <span aria-hidden>→</span>
    </Link>
  )
}

/**
 * The columns of a section's grid on desktop: as many as cards, at most 3 (Figma A-01d), so
 * two share the width (A-01pd) and no column stays empty (DESIGN.md › Layout). A phone has one.
 */
export const homeGridColumns = (count: number): string | undefined =>
  count >= 3 ? "md:grid-cols-3" : count === 2 ? "md:grid-cols-2" : undefined
