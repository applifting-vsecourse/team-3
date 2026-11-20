import { useState } from "react"
import { Check, Plus, Search } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { searchActivities } from "@/lib/catalog/activitySelection"
import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"
import { cn } from "@/lib/utils"

const STARTING_ACTIVITIES = [
  "volejbal",
  "turistika",
  "deskove-hry",
  "badminton",
  "beh",
  "fotografie",
  "pub-kviz",
  "cyklistika",
  "tanec",
  "komunitni-zahrada",
  "lezeni",
  "spolecne-vareni",
]

type InterestPickerProps = {
  categories: ActivityCategory[]
  selected: string[]
  onToggle: (id: string) => void
  isDisabled: boolean
}

export function InterestPicker({
  categories,
  selected,
  onToggle,
  isDisabled,
}: InterestPickerProps) {
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [isShowingAll, setIsShowingAll] = useState(false)
  const isSearching = Boolean(query.trim())
  const isOverview = !isSearching && !categoryId && !isShowingAll
  const visibleCategories = categoryId
    ? categories.filter((category) => category.id === categoryId)
    : categories
  const allMatches = visibleCategories.flatMap((category) =>
    category.activities.map((activity) => ({ category, activity })),
  )
  const featured = STARTING_ACTIVITIES.flatMap((slug) =>
    allMatches.filter(({ activity }) => activity.slug === slug),
  )
  const matches = isSearching
    ? searchActivities(visibleCategories, query)
    : isOverview && featured.length > 0
      ? featured
      : allMatches

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label
          htmlFor="onboarding-activity-search"
          className="sr-only"
        >
          Hledat aktivitu
        </Label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="onboarding-activity-search"
          type="search"
          placeholder="Hledej třeba volejbal nebo běh"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 rounded-full pl-12"
        />
      </div>
      <div
        role="group"
        aria-label="Kategorie aktivit"
        className="flex [scrollbar-width:none] gap-2 overflow-x-auto p-1 sm:flex-wrap"
      >
        <button
          type="button"
          aria-pressed={!categoryId}
          onClick={() => setCategoryId("")}
          className="shrink-0 rounded-full border border-control-border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-hero aria-pressed:bg-hero aria-pressed:text-on-hero"
        >
          Vše
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={category.id === categoryId}
            onClick={() => setCategoryId(category.id)}
            className="flex shrink-0 items-center gap-2 rounded-full border border-control-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-hero aria-pressed:bg-hero aria-pressed:text-on-hero"
          >
            <ActivityTile
              icon={category.icon}
              className="size-4 border-0 bg-transparent text-current"
              iconClassName="size-4"
            />
            {category.name}
          </button>
        ))}
      </div>
      {matches.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {matches.map(({ activity, category }, index) => {
            const isPicked = selected.includes(activity.id)
            const photo = activityPhoto(activity.slug)
            const Icon = isPicked ? Check : Plus
            return (
              <button
                key={activity.id}
                type="button"
                aria-pressed={isPicked}
                disabled={isDisabled}
                onClick={() => onToggle(activity.id)}
                className={cn(
                  "group relative isolate flex aspect-[4/3] min-w-0 items-end overflow-hidden rounded-xl border-2 border-transparent bg-hero p-3 text-left text-white shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-transform motion-safe:active:scale-95",
                  isPicked && "border-primary ring-2 ring-primary-edge",
                )}
              >
                {photo ? (
                  <img
                    src={photo.src}
                    alt=""
                    loading={index < 8 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 -z-10 size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
                  />
                ) : (
                  <ActivityTile
                    icon={category.icon}
                    className="absolute top-3 left-3 -z-10 size-8"
                    iconClassName="size-5"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 bg-linear-to-t from-black via-black/35 to-black/5"
                />
                <span className="relative w-full text-sm leading-tight font-semibold wrap-break-word md:text-base">
                  {activity.name}
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
      ) : (
        <p
          role="status"
          className="rounded-xl border border-card-border bg-card p-4 text-sm text-muted-foreground"
        >
          Tady jsem žádnou aktivitu nenašel. Zkus jiný název nebo vyber „Vše“.
        </p>
      )}
      {isOverview && featured.length < allMatches.length ? (
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setIsShowingAll(true)}
        >
          Zobrazit všechny aktivity
        </button>
      ) : null}
    </div>
  )
}
