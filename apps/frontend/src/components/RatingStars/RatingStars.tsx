import { Star } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { RadioGroup } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

const STARS = [1, 2, 3, 4, 5] as const

type RatingStarsProps = {
  /** 1–5, or null while nothing is picked (Figma Hodnota=0). */
  value: number | null
  onChange: (stars: number) => void
  /** From the form (FormControl), so its message is announced with the group. */
  id?: string
  /** The visible question above the stars („Jak se akce povedla?“). */
  "aria-labelledby": string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  isDisabled?: boolean
}

/**
 * Picking 1–5 stars (Figma Hodnocení/Hvězdičky, DESIGN.md › Rating stars): a radio group, each
 * star a 40 px target named „3 z 5 hvězd“. The stars up to the picked one are full
 * (`foreground`), the rest outlined in `control-border` — never lime, which fails 3:1.
 *
 * The group and its keyboard handling are the kit's Radix radio group; only the item is drawn
 * here, because the kit's `RadioGroupItem` draws its own dot and takes no star.
 */
export function RatingStars({ value, onChange, isDisabled = false, ...aria }: RatingStarsProps) {
  return (
    <RadioGroup
      value={value === null ? "" : String(value)}
      onValueChange={(next) => onChange(Number(next))}
      disabled={isDisabled}
      orientation="horizontal"
      className="flex gap-1"
      {...aria}
    >
      {STARS.map((stars) => {
        const isFull = value !== null && stars <= value
        return (
          <RadioGroupPrimitive.Item
            key={stars}
            value={String(stars)}
            aria-label={`${stars} z ${STARS.length} hvězd`}
            className="flex size-10 items-center justify-center rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Star
              aria-hidden
              strokeWidth={1.5}
              className={cn(
                "size-7",
                isFull ? "fill-foreground text-foreground" : "fill-none text-control-border",
              )}
            />
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroup>
  )
}
