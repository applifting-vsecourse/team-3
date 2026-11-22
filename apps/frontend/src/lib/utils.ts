import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The type-* text styles from global.css (DESIGN.md › Type), grouped by the properties each one
// sets. A type-* class removes an earlier class for the same property, so the kit's
// `text-lg leading-none font-semibold` on DialogTitle no longer outranks type-title in the CSS
// (review #384). Each group lists only what its styles set: type-lead keeps a font-semibold.
const typeStyles = {
  "type-display-tracked": ["hero", "title", "wordmark"],
  "type-display": ["feature", "card-title", "row-title", "date-l", "date-m", "date-s", "stamp"],
  "type-tracked": ["card-heading", "step"],
  "type-text": ["lead", "intro"],
} as const
type TypeGroup = keyof typeof typeStyles
const typeGroups = Object.keys(typeStyles) as TypeGroup[]
const typeProperties: Record<TypeGroup, string[]> = {
  "type-display-tracked": ["font-family", "font-weight", "font-size", "leading", "tracking"],
  "type-display": ["font-family", "font-weight", "font-size", "leading"],
  "type-tracked": ["font-weight", "font-size", "leading", "tracking"],
  "type-text": ["font-size", "leading"],
}

// text-body and text-caption are font sizes from global.css; unknown text-* would otherwise
// count as a colour and text-muted-foreground would drop them. band-tabs is a spacing from
// global.css: unknown, h-band-tabs would not replace the kit's height and only the CSS order
// would decide which wins (review #311).
const twMerge = extendTailwindMerge<TypeGroup>({
  extend: {
    theme: { text: ["body", "caption"], spacing: ["band-tabs"] },
    classGroups: Object.fromEntries(
      typeGroups.map((group) => [group, [{ type: [...typeStyles[group]] }]]),
    ),
    // a later type-* also replaces an earlier one from another group
    conflictingClassGroups: Object.fromEntries(
      typeGroups.map((group) => [group, [...typeProperties[group], ...typeGroups]]),
    ),
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
