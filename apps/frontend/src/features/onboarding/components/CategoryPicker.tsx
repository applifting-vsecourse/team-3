import { Check, Plus } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"
import { cn } from "@/lib/utils"

const CATEGORY_COVER: Record<string, string> = {
  "tymove-sporty": "volejbal",
  "raketove-sporty": "badminton",
  "pohyb-a-tanec": "tanec",
  outdoor: "turistika",
  hry: "deskove-hry",
  "kvizy-a-jazyky": "pub-kviz",
  "tvoreni-a-hudba": "fotografie",
  komunita: "komunitni-zahrada",
}

export function CategoryPicker({
  categories,
  selected,
  onToggle,
}: {
  categories: ActivityCategory[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {categories.map((category, index) => {
        const isPicked = selected.includes(category.id)
        const photo = activityPhoto(
          CATEGORY_COVER[category.slug] ?? category.activities[0]?.slug ?? "",
        )
        const Icon = isPicked ? Check : Plus
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isPicked}
            onClick={() => onToggle(category.id)}
            style={{ animationDelay: `${Math.min(index, 7) * 28}ms` }}
            className={cn(
              "group relative isolate flex min-h-32 min-w-0 items-end overflow-hidden rounded-xl border-2 border-transparent bg-hero p-3 text-left text-on-hero outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:slide-in-from-bottom-3 motion-safe:active:scale-95",
              isPicked && "border-primary ring-2 ring-primary-edge",
            )}
          >
            {photo ? (
              <img
                src={photo.src}
                alt=""
                decoding="async"
                className="absolute inset-0 -z-10 size-full object-cover motion-safe:transition-transform motion-safe:group-hover:scale-105"
              />
            ) : null}
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-black/5"
            />
            <span className="flex min-w-0 items-center gap-2 text-sm leading-tight font-semibold sm:text-base">
              <ActivityTile
                icon={category.icon}
                className="size-6 border-0 bg-transparent text-current"
                iconClassName="size-5"
              />
              <span className="wrap-break-word">{category.name}</span>
            </span>
            <span
              key={isPicked ? "selected" : "available"}
              aria-hidden
              className={cn(
                "absolute top-2 right-2 grid size-7 place-items-center rounded-full border border-white/70 bg-black/65 text-white",
                isPicked &&
                  "border-primary bg-primary text-primary-foreground motion-safe:duration-200 motion-safe:animate-in motion-safe:zoom-in-50",
              )}
            >
              <Icon className="size-4" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
