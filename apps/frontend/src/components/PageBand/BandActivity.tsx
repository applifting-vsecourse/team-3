import { ActivityTile } from "@/components/ActivityTile/ActivityTile"

type BandActivityProps = {
  activity: { name: string; category: { name: string; icon: string } }
}

/** The activity above a detail's title, on the band (Figma A-05d, A-08d › Aktivita). */
export function BandActivity({ activity }: BandActivityProps) {
  return (
    <div className="flex items-center gap-3">
      <ActivityTile
        icon={activity.category.icon}
        className="size-11 border-on-hero-muted bg-transparent text-on-hero"
      />
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="font-semibold text-on-hero">{activity.name}</span>
        <span className="text-on-hero-muted">{activity.category.name}</span>
      </div>
    </div>
  )
}
