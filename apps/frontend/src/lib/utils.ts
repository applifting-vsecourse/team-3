import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// text-body and text-caption are font sizes from global.css; unknown text-* would otherwise
// count as a colour and text-muted-foreground would drop them. band-tabs is a spacing from
// global.css: unknown, h-band-tabs would not replace the kit's height and only the CSS order
// would decide which wins (review #311).
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["body", "caption"], spacing: ["band-tabs"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
