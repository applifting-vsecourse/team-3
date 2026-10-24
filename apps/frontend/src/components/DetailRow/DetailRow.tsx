import type { ComponentType, ReactNode } from "react"

type DetailRowProps = {
  icon: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
}

/**
 * One fact of a detail page — „Termín“, „Místo“… (Figma: Detail row).
 * Use inside a `<dl>`. A `<div>` in a `<dl>` may hold only its dt and dd, so
 * the icon sits inside the dt and is placed in the left column (pl-8 = icon
 * size-5 + gap-3) rather than being a flex item beside them.
 */
export function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="relative pl-8">
      <dt className="text-sm text-muted-foreground">
        <Icon
          aria-hidden
          className="absolute top-0 left-0 size-5"
        />
        {label}
      </dt>
      <dd className="text-base">{children}</dd>
    </div>
  )
}
