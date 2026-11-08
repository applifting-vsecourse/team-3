import { cn } from "@/lib/utils"

/**
 * „Koná se“ (Figma Stamp/Koná se, DESIGN.md › Koná se stamp): the event reached its minimum.
 * Only on an event detail, never on cards — there it would be on nearly every one and say
 * nothing. Lime with the primary-edge outline, Brand/Stamp, rotated −6°.
 */
export function HappeningStamp({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-6 rounded-md border border-primary-edge bg-primary px-2 py-0.5 type-stamp whitespace-nowrap text-primary-foreground",
        className,
      )}
    >
      Koná se
    </span>
  )
}
