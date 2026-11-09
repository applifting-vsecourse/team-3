import { cn } from "@/lib/utils"

type LogoMarkProps = {
  /** On the dark green band (Figma Pozadí=Tmavé): cream dots without an outline, a lime ring. */
  isOnHero?: boolean
  /** „Plná parta“: the missing one is filled in — you are in (Jdu, Máš místo). */
  isFull?: boolean
  /** With `isFull`: the „ty“ dot grows in, right after joining — only under motion-safe. */
  isFillAnimated?: boolean
  className?: string
}

const DOTS = [
  [7, 7],
  [21, 7],
  [7, 21],
] as const

/**
 * The brand mark (Figma Logo/Mark, Logo/Mark/Plná parta): three dots and an empty ring —
 * the group missing one, and that one is you (DESIGN.md › Logo). Off the band the empty
 * ring is dashed. Decorative: the name
 * next to it or the heading says what it is.
 */
export function LogoMark({
  isOnHero = false,
  isFull = false,
  isFillAnimated = false,
  className,
}: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
      data-full={isFull || undefined}
    >
      {DOTS.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={isOnHero ? 5 : 4.25}
          className={isOnHero ? "fill-on-hero" : "fill-logo-dot stroke-logo-dot-stroke"}
          strokeWidth={isOnHero ? undefined : 1.5}
        />
      ))}
      {isOnHero ? (
        <circle
          cx="21"
          cy="21"
          r={isFull ? 5 : 3.9}
          className={isFull ? "fill-primary" : "fill-none stroke-primary"}
          strokeWidth={isFull ? undefined : 2.2}
        />
      ) : (
        <circle
          cx="21"
          cy="21"
          r={isFull ? 4.25 : 3.75}
          data-slot="logo-self"
          className={cn(
            "stroke-logo-self-stroke",
            isFull ? "fill-primary" : "fill-none",
            // grows from its own centre; without motion it is simply there
            isFull &&
              isFillAnimated &&
              "origin-center transform-fill motion-safe:duration-500 motion-safe:animate-in motion-safe:zoom-in-0",
          )}
          strokeWidth="1.5"
          // the missing one is a dashed ring, eight dashes round (Figma „Logo – chybí jeden“,
          // A-01, A-01d); on the band the ring stays whole and lime
          {...(isFull ? {} : { pathLength: 16, strokeDasharray: "1 1" })}
        />
      )}
    </svg>
  )
}

/** The mark and the wordmark (Figma Logo). */
export function Logo({ isOnHero = false }: { isOnHero?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 type-wordmark",
        isOnHero ? "text-on-hero" : "text-foreground",
      )}
    >
      <LogoMark isOnHero={isOnHero} />
      HobbyHub
    </span>
  )
}
