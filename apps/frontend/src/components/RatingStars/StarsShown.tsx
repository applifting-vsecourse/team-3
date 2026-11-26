import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

const STARS = [1, 2, 3, 4, 5] as const

/**
 * One given rating shown, not picked (PO 26. 11.: „4 plné hvězdičky a pátou prázdnou“, not
 * „4 z 5“): full stars `foreground`, empty ones outlined in `control-border`, like the input
 * (DESIGN.md › Rating stars). Read out as one image, „4 z 5 hvězd“.
 */
export function StarsShown({ stars, className }: { stars: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${stars} z ${STARS.length} hvězd`}
      className={cn("inline-flex gap-0.5 align-[-2px]", className)}
    >
      {STARS.map((star) => (
        <Star
          key={star}
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            "size-4",
            star <= stars ? "fill-foreground text-foreground" : "fill-none text-control-border",
          )}
        />
      ))}
    </span>
  )
}
