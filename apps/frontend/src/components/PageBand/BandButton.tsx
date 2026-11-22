import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A button on the band (the landing page's, the 404's): 44 px, label large. The outline one has
 * the `on-hero` outline, its hover is the kit's. One place, so the bands don't drift (review #397).
 */
export function BandButton({ variant, className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      className={cn(
        "h-11 px-5 text-base font-semibold",
        variant === "outline" && "border-on-hero",
        className,
      )}
      {...props}
    />
  )
}
