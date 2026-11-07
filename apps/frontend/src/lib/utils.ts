import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// text-body and text-caption are font sizes from global.css; unknown text-* would otherwise
// count as a colour and text-muted-foreground would drop them.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["body", "caption"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
