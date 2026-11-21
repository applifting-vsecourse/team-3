import { useRef, useState, type MouseEvent, type ReactNode } from "react"
import { Compass, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { searchActivities } from "@/lib/catalog/activitySelection"
import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"

import { coverForCategory, DISCOVERY_PHOTOS } from "@/features/onboarding/lib/activityScenes"

import { OnboardingCard } from "./OnboardingCard"

type InterestPickerProps = {
  categories: ActivityCategory[]
  categoryId: string
  selected: string[]
  isDisabled?: boolean
  onBrowse: (id: string) => void
  onToggle: (activity: Activity, target: HTMLButtonElement) => void
  renderEventPreview?: (categoryId: string) => ReactNode
}

export function InterestPicker({
  categories,
  categoryId,
  selected,
  isDisabled,
  onBrowse,
  onToggle,
  renderEventPreview,
}: InterestPickerProps) {
  const [query, setQuery] = useState("")
  const [isShowingAll, setIsShowingAll] = useState(false)
  const shelf = useRef<HTMLDivElement>(null)
  const active = categories.find(({ id }) => id === categoryId)
  const isSearching = Boolean(query.trim())
  const isFocused = Boolean(active) || isSearching || isShowingAll
  const allActivities = (active ? [active] : categories).flatMap((category) =>
    category.activities.map((activity) => ({ activity, category })),
  )
  const firstChoices = DISCOVERY_PHOTOS.flatMap((slug) =>
    allActivities.filter(({ activity }) => activity.slug === slug),
  )
  const choices = isSearching
    ? searchActivities(categories, query)
    : active || isShowingAll || firstChoices.length === 0
      ? allActivities
      : firstChoices

  function browse(id: string, event: MouseEvent<HTMLButtonElement>) {
    setQuery("")
    setIsShowingAll(id === "")
    onBrowse(id)
    const button = event.currentTarget
    requestAnimationFrame(() => {
      if (!shelf.current?.contains(button)) return
      const { left, right } = shelf.current.getBoundingClientRect()
      const item = button.getBoundingClientRect()
      if (item.left < left) shelf.current.scrollLeft += item.left - left - 6
      if (item.right > right) shelf.current.scrollLeft += item.right - right + 6
    })
  }

  return (
    <div className="space-y-5">
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
          placeholder="Najdi třeba volejbal, deskovky nebo běh"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-12 rounded-xl bg-card pl-12 text-base"
        />
      </div>

      <section
        aria-labelledby="onboarding-shelf-heading"
        className="space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="onboarding-shelf-heading"
            className="font-semibold"
          >
            Co tě láká?
          </h2>
          {!isFocused ? (
            <Button
              type="button"
              variant="link"
              className="min-h-11"
              onClick={(event) => browse("", event)}
            >
              Všechny aktivity
            </Button>
          ) : null}
        </div>
        <div
          ref={shelf}
          className={
            isFocused
              ? "flex [scrollbar-width:none] gap-2 overflow-x-auto p-1"
              : "grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 xl:grid-cols-4"
          }
        >
          {isFocused ? (
            <Button
              type="button"
              variant={categoryId || isSearching ? "outline" : "secondary"}
              aria-pressed={!categoryId && !isSearching}
              className="min-h-12 bg-card"
              onClick={(event) => browse("", event)}
            >
              <Compass aria-hidden /> Všechny aktivity
            </Button>
          ) : null}
          {categories.map((category, index) => (
            <OnboardingCard
              key={category.id}
              name={category.name}
              photoSlug={coverForCategory(category)}
              icon={category.icon}
              kind="category"
              isCompact={isFocused}
              isSelected={!isSearching && category.id === categoryId}
              order={index}
              onSelect={(event) => browse(category.id, event)}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="onboarding-results-heading"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="onboarding-results-heading"
            className="type-card-heading"
          >
            {isSearching ? "Výsledky hledání" : (active?.name ?? "Aktivity napříč okruhy")}
          </h2>
          {isSearching || active || isShowingAll ? (
            <span
              role="status"
              className="text-sm text-muted-foreground"
            >
              {choices.length}{" "}
              {choices.length === 1
                ? "aktivita"
                : choices.length > 1 && choices.length < 5
                  ? "aktivity"
                  : "aktivit"}
            </span>
          ) : null}
        </div>
        {!isSearching && active ? renderEventPreview?.(active.id) : null}

        {choices.length > 0 ? (
          <div
            key={isSearching ? "search" : categoryId}
            className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 xl:grid-cols-4"
          >
            {choices.map(({ activity, category }, index) => (
              <OnboardingCard
                key={activity.id}
                name={activity.name}
                photoSlug={activity.slug}
                icon={category.icon}
                kind="activity"
                interestId={activity.id}
                isSelected={selected.includes(activity.id)}
                isDisabled={isDisabled}
                order={isSearching ? 0 : index}
                onSelect={(event) => onToggle(activity, event.currentTarget)}
              />
            ))}
          </div>
        ) : (
          <p
            role="status"
            className="rounded-xl border border-card-border bg-card p-4 text-sm text-muted-foreground"
          >
            Tohle hledání nic nenašlo. Zkus název jedné aktivity nebo otevři celý seznam.
          </p>
        )}
      </section>
    </div>
  )
}
