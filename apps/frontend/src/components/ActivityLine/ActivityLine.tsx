import { CategoryIcon } from "@/components/ActivityTile/ActivityTile"
import { cn } from "@/lib/utils"

type ActivityLineProps = {
  activity: { name: string; category: { icon: string } }
  className?: string
}

/**
 * The activity on an event card, on a line of its own above the title (#348, Figma Karta akce ›
 * Aktivita): the category's icon and the activity's name, as the detail's band has it above its
 * title. A photo or a poster doesn't always say what the event is, nor does its title.
 */
export function ActivityLine({ activity, className }: ActivityLineProps) {
  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-caption font-semibold text-foreground",
        className,
      )}
    >
      <CategoryIcon
        icon={activity.category.icon}
        className="size-4 shrink-0"
      />
      <span className="sr-only">Aktivita: </span>
      <span className="truncate">{activity.name}</span>
    </p>
  )
}
