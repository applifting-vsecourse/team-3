import { cn } from "@/lib/utils"

/** The activity of an event or group, e.g. „Deskové hry“ (Figma: Tag/Activity). */
export function ActivityTag({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground",
        className,
      )}
    >
      {name}
    </span>
  )
}
