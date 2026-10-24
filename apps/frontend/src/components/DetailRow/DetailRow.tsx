import type { ComponentType, ReactNode } from "react"

type DetailRowProps = {
  icon: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
}

/**
 * One fact of a detail page — „Termín“, „Místo“… (Figma: Detail row).
 * Use inside a `<dl>`.
 */
export function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="flex gap-3">
      <Icon
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-col">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-base">{children}</dd>
      </div>
    </div>
  )
}
