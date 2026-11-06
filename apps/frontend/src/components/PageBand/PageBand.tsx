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
   * Hero-size title and its line, with the motif.
   */
  variant?: "section" | "sub" | "hero"
  /** `section`: „Plná parta“ where the page is about the groups you are in (Figma A-07, C-01). */
  isMarkFull?: boolean
  /** `sub`: where the arrow leads. */
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
  /** Tabs on the band's bottom edge (BandTabs). */
  children?: ReactNode
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
}: PageBandProps) {
  const isSection = variant === "section"
  const isHero = variant === "hero"

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-band-edge on-hero",
        isPlainOnMobile && "max-md:border-b-0 max-md:bg-background",
      )}
    >
      {isSection || isHero ? <LogoMotif /> : null}
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-col px-4 md:px-10",
          isHero
            ? "gap-4 pt-8 pb-10 md:gap-6 md:pt-16 md:pb-16"
            : isSection
              ? "gap-3 pt-1 md:gap-5 md:pt-6"
              : cn(
                  "gap-3 pt-4 pb-5 md:gap-3 md:pt-5 md:pb-9",
                  // without a back link the title starts lower (Figma B-01d, B-03d)
                  !back && "md:pt-12",
                  isCompactOnMobile && "py-2",
                  isPlainOnMobile && "pt-8 pb-0",
                ),
          isSection && !children && "pb-6 md:pb-9",
        )}
      >
        {back ? (
          <BackLink
            {...back}
            isIconOnlyOnMobile={isCompactOnMobile}
          />
        ) : null}
        {eyebrow ? (
          <div className={cn(isCompactOnMobile && "hidden md:block")}>{eyebrow}</div>
        ) : null}
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
                    ? "truncate text-base font-semibold md:overflow-visible md:type-title md:whitespace-normal"
                    : "type-title",
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
              (isSection || isCompactOnMobile || isPlainOnMobile) && "hidden md:block",
            )}
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
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
