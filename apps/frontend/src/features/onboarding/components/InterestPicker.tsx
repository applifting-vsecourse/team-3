import { useState } from "react"
import { Check, ChevronDown, Plus, Search } from "lucide-react"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { searchActivities } from "@/lib/catalog/activitySelection"
import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"
import { cn } from "@/lib/utils"

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
  const [open, setOpen] = useState<string[]>([])
  const isSearching = query.trim().length > 0
  const matches = isSearching ? searchActivities(categories, query) : []

  function choice(category: ActivityCategory, activity: Activity, detail?: string) {
    const isSelected = selected.includes(activity.id)
    const Icon = isSelected ? Check : Plus
    return (
      <button
        key={activity.id}
        type="button"
        disabled={isDisabled}
        aria-pressed={isSelected}
        onClick={() => onToggle(activity.id)}
        className={cn(
          "flex min-h-12 w-full items-center gap-2 rounded-lg border px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150",
          isSelected
            ? "border-primary-edge bg-secondary text-secondary-foreground"
            : "border-control-border bg-card hover:bg-accent",
        )}
      >
        <ActivityTile
          icon={category.icon}
          className="size-8"
          iconClassName="size-5"
        />
        <span className="grow text-sm">
          <span className="font-medium">{activity.name}</span>
          {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
        </span>
        <Icon
          key={isSelected ? "selected" : "available"}
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            isSelected && "motion-safe:duration-200 motion-safe:animate-in motion-safe:zoom-in-50",
          )}
        />
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="onboarding-activity-search">Hledat aktivitu</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="onboarding-activity-search"
            type="search"
            placeholder="Třeba volejbal"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 bg-card pl-10"
          />
        </div>
      </div>
      {isSearching ? (
        matches.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {matches.map(({ category, activity, matchedKeyword }) =>
              choice(category, activity, matchedKeyword ?? category.name),
            )}
          </div>
        ) : (
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Žádná aktivita neodpovídá hledání. Zkus jiný výraz.
          </p>
        )
      ) : (
        <div className="grid gap-2">
          {categories.map((category) => {
            const isOpen = open.includes(category.id)
            const selectedCount = category.activities.filter(({ id }) =>
              selected.includes(id),
            ).length
            const panelId = `onboarding-category-${category.id}`
            return (
              <div
                key={category.id}
                className="min-w-0 rounded-2xl border border-card-border bg-card"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpen((current) =>
                      isOpen
                        ? current.filter((id) => id !== category.id)
                        : [...current, category.id],
                    )
                  }
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ActivityTile
                    icon={category.icon}
                    className="size-9"
                    iconClassName="size-5"
                  />
                  <span className="grow">{category.name}</span>
                  {selectedCount > 0 ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {selectedCount} vybr.
                    </span>
                  ) : null}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 motion-safe:transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  id={panelId}
                  hidden={!isOpen}
                >
                  {isOpen ? (
                    <div className="grid gap-2 px-3 pt-1 pb-3 sm:grid-cols-2">
                      {category.activities.map((activity) => choice(category, activity))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
