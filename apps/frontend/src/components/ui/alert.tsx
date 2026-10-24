import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        // Figma: Alert, tone Destructive (zrušená akce, neaktivní skupina, chyby): a destructive
        // hairline and title, the body in foreground so it stays readable
        destructive:
          "border-destructive bg-card text-destructive *:data-[slot=alert-description]:text-foreground *:data-[slot=alert-title]:font-semibold [&>svg]:text-current",
        // Figma: Alert, tones Info (ověření e-mailu, čekající žádost) and Neutral (poznámka)
        info: "border-0 bg-secondary text-secondary-foreground has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] *:data-[slot=alert-description]:text-secondary-foreground *:data-[slot=alert-title]:font-semibold [&>svg]:size-5 [&>svg]:translate-y-0",
        neutral:
          "border-0 bg-muted text-foreground has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] *:data-[slot=alert-description]:text-foreground *:data-[slot=alert-title]:font-semibold [&>svg]:size-5 [&>svg]:translate-y-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
