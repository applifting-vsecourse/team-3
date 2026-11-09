import type { ReactNode } from "react"

import { BackLink, type BackLinkProps } from "@/components/BackLink/BackLink"
import { LogoMark } from "@/components/Logo/Logo"
import { cn } from "@/lib/utils"

type PageBandProps = {
  title: ReactNode
  /** One supporting line (Figma Body/Intro). */
  description?: ReactNode
  /**
   * `section` – a top-level page (Akce, Skupiny, Moje akce): the logo mark before the title
   * and on desktop the big logo motif. `sub` – a page under one of them (detail, form,
   * management, account): a back link instead of the mark. `hero` – the landing page: the
   * Hero-size title and its line, with the motif. `detail` – an event's detail (Figma A-05,
   * A-05d): as `sub` with the motif; on a phone the page puts its own bar and the photo above
   * the band, so the back link and the line show from `md` only.
   */
  variant?: "section" | "sub" | "hero" | "detail"
  /** `section`: „Plná parta“ where the page is about the groups you are in (Figma A-07, C-01). */
  isMarkFull?: boolean
  /** `sub`, `detail`: where the arrow leads. */
  back?: Omit<BackLinkProps, "isIconOnlyOnMobile">
  /**
   * `sub`: on a phone only the arrow and the title in one bar (Figma Header/Sub) — forms
   * and management, where the content should start right away.
   */
  isCompactOnMobile?: boolean
  /**
   * `sub`: on a phone the title sits on the page without the band and the line (Figma B-01,
   * B-03 — sign-in and sign-up, where the form should start right away).
   */
  isPlainOnMobile?: boolean
  /** Above the title, e.g. the activity of an event (Figma A-05d). */
  eyebrow?: ReactNode
  /** The page's one main action, beside the title on desktop (Založit akci, Založit skupinu). */
  action?: ReactNode
  /** Tabs on the band's bottom edge (BandTabs), or what follows the title (the „Koná se“ stamp). */
  children?: ReactNode
  /**
   * `hero`: beside the title, its line and the children on desktop, under them on a phone —
   * the landing page's panel „Teď chybí jeden“ (Figma A-01, A-01d).
   */
  aside?: ReactNode
}

/**
 * The dark green band every top-level page starts with (DESIGN.md › Layout, Figma „Úvodní
 * pás“): it continues the header, holds the page's H1 and one supporting line, and on
 * section pages the logo motif — the group missing one.
 */
export function PageBand({
  title,
  description,
  variant = "sub",
  isMarkFull = false,
  back,
  isCompactOnMobile = false,
  isPlainOnMobile = false,
  eyebrow,
  action,
  children,
  aside,
}: PageBandProps) {
  const isSection = variant === "section"
  const isHero = variant === "hero"
  const isDetail = variant === "detail"

  const content = (
    <>
      {back ? (
        <div className={cn(isDetail && "hidden md:block")}>
          <BackLink
            {...back}
            isIconOnlyOnMobile={isCompactOnMobile}
          />
        </div>
      ) : null}
      {eyebrow ? <div className={cn(isCompactOnMobile && "hidden md:block")}>{eyebrow}</div> : null}
      <div
        className={cn(
          "flex items-center justify-between gap-6",
          // the arrow and the title share one bar on a phone
          isCompactOnMobile && "absolute top-2 right-4 left-14 h-10 md:static md:h-auto",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {isSection ? (
            <LogoMark
              isOnHero
              isFull={isMarkFull}
              className="size-8 md:size-11"
            />
          ) : null}
          <h1
            className={cn(
              "min-w-0 text-balance text-on-hero",
              isHero
                ? // stays left of the motif's ring (xl)
                  "max-w-3xl type-hero"
                : isCompactOnMobile
                  ? // the phone's bar title is Figma Header/Sub's Label/Strong
                    "truncate text-sm font-semibold md:overflow-visible md:type-title md:whitespace-normal"
                  : // the detail's title stays left of the motif's ring (xl)
                    cn("type-title", isDetail && "xl:max-w-3xl"),
              isPlainOnMobile && "max-md:text-foreground",
            )}
          >
            {title}
          </h1>
        </div>
        {/* beside the title on desktop; on a phone the page's button floats above the
              bottom navigation (DESIGN.md › Založit akci) */}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p
          className={cn(
            "max-w-3xl text-on-hero-muted",
            isHero ? "type-lead" : "text-body md:type-intro",
            // a section band on a phone is just the title and its tabs (Figma A-02, A-07, C-01)
            (isSection || isDetail || isCompactOnMobile || isPlainOnMobile) && "hidden md:block",
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </>
  )

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-band-edge on-hero",
        isPlainOnMobile && "max-md:border-b-0 max-md:bg-background",
      )}
    >
      {isSection || isDetail ? <LogoMotif /> : null}
      {isHero ? <HeroMotif /> : null}
      {/* a phone has the corner motif on the landing page too (Figma A-01 › Motiv loga (návrh 16)) */}
      {/* the landing page keeps it until its big motif shows (lg), the detail until md (review #263) */}
      {isDetail || isHero ? <CornerMotif isUntilLg={isHero} /> : null}
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-col px-4 md:px-10",
          isHero
            ? "gap-4 pt-8 pb-10 md:gap-6 md:pt-16 md:pb-16"
            : isSection
              ? "gap-3 pt-1 md:gap-5 md:pt-6"
              : cn(
                  "gap-3 md:gap-3 md:pb-9",
                  // phone: one bar (Header/Sub), the title on the page (B-03) or the plain band
                  isCompactOnMobile ? "py-2" : isPlainOnMobile ? "pt-8 pb-0" : "pt-4 pb-5",
                  // without a back link the title starts lower (Figma B-01d, B-03d)
                  back ? "md:pt-5" : "md:pt-12",
                ),
          isSection && !children && "pb-6 md:pb-9",
        )}
      >
        {aside ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-16">
            <div className="flex min-w-0 flex-col gap-4 md:gap-6 lg:flex-1">{content}</div>
            <div className="lg:w-120 lg:shrink-0">{aside}</div>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  )
}

/**
 * The landing page's logo rising from the band's bottom edge on the left (Figma A-01d, A-01pd ›
 * Motiv loga (vychází zespodu)): the faint dots behind the title, the lime ring's arc under the
 * buttons — the panel takes the right side. From lg, where the panel stands beside the title.
 * Decoration — hidden from assistive tech.
 */
function HeroMotif() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 700 630"
      width={700}
      height={630}
      className="pointer-events-none absolute bottom-0 left-0 hidden lg:block"
    >
      <circle
        cx="30"
        cy="260"
        r="210"
        className="fill-hero-pattern"
      />
      <circle
        cx="490"
        cy="260"
        r="210"
        className="fill-hero-pattern"
      />
      <circle
        cx="30"
        cy="720"
        r="210"
        className="fill-hero-pattern"
      />
      <circle
        cx="490"
        cy="720"
        r="206"
        strokeWidth="8"
        className="fill-none stroke-primary"
      />
    </svg>
  )
}

/**
 * On a phone the detail's band has the logo's faint dots in its top-right corner, the ring
 * past the edge (Figma A-05 › Motiv loga (návrh 16)); from `md` the big motif takes over (xl).
 * Decoration — hidden from assistive tech.
 */
function CornerMotif({ isUntilLg = false }: { isUntilLg?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 194 194"
      width={194}
      height={194}
      className={cn(
        "pointer-events-none absolute -top-4 -right-22",
        isUntilLg ? "lg:hidden" : "md:hidden",
      )}
    >
      <circle
        cx="45"
        cy="45"
        r="45"
        className="fill-on-hero opacity-12"
      />
      <circle
        cx="149"
        cy="45"
        r="45"
        className="fill-on-hero opacity-12"
      />
      <circle
        cx="45"
        cy="149"
        r="45"
        className="fill-on-hero opacity-12"
      />
      <circle
        cx="149"
        cy="149"
        r="43.5"
        strokeWidth="3"
        className="fill-none stroke-primary"
      />
    </svg>
  )
}

/**
 * The big logo rising from the band's bottom edge (Figma „Motiv loga (vychází zespodu)“):
 * three faint dots and the lime ring, the missing one. Only from xl, where it stays right of
 * the title, the line and the tabs as in Figma — narrower, the ring would run under the text.
 * Decoration — hidden from assistive tech.
 */
function LogoMotif() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mx-auto hidden max-w-7xl xl:block"
    >
      <svg
        viewBox="0 -298 744 484"
        width={744}
        height={484}
        className="absolute right-4 bottom-0"
      >
        <circle
          cx="180"
          cy="-118"
          r="180"
          className="fill-hero-pattern"
        />
        <circle
          cx="564"
          cy="-118"
          r="180"
          className="fill-hero-pattern"
        />
        <circle
          cx="180"
          cy="266"
          r="180"
          className="fill-hero-pattern"
        />
        <circle
          cx="564"
          cy="266"
          r="176.5"
          strokeWidth="7"
          className="fill-none stroke-primary"
        />
      </svg>
    </div>
  )
}
