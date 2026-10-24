import type { ComponentType, ReactNode } from "react"

type DetailRowProps = {
  icon: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
}

/**
 * One fact of a detail page — „Termín“, „Místo“… (Figma: Detail row): the
 * icon in a muted box, the label above the value. Use inside a `<dl>`.
 * A `<div>` in a `<dl>` may hold only its dt and dd, so the icon box sits
 * inside the dt; `contents` lets it take the grid's first column beside both.
 */
export function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
      {/* the label text becomes the grid's second item and still inherits the dt's type */}
      <dt className="contents text-xs font-medium text-muted-foreground">
        <span
          aria-hidden
          className="row-span-2 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground"
        >
          <Icon className="size-5" />
        </span>
        {label}
      </dt>
      <dd className="col-start-2 text-base">{children}</dd>
    </div>
  )
}
