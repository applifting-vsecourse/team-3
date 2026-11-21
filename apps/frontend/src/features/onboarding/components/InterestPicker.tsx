import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown, Compass, Search } from "lucide-react"

import { activityPhoto } from "@/assets/activity-photos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { searchActivities } from "@/lib/catalog/activitySelection"
import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"
import { cn } from "@/lib/utils"

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
  const [isCategoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const [browseRevision, setBrowseRevision] = useState(0)
  const shelfStart = useRef<HTMLDivElement>(null)
  const switcher = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const active = categories.find(({ id }) => id === categoryId)
  const isSearching = Boolean(query.trim())
  const isFocused = Boolean(active) || isSearching || isShowingAll
  const isCategoryGridShown = !isFocused || isCategoryMenuOpen
  const cover = active && activityPhoto(coverForCategory(active))
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

  useLayoutEffect(() => {
    if (browseRevision === 0) return
    shelfStart.current?.scrollIntoView?.({ block: "start", behavior: "instant" })
    switcher.current?.focus({ preventScroll: true })
  }, [browseRevision])

  function browse(id: string) {
    setQuery("")
    setIsShowingAll(id === "")
    setCategoryMenuOpen(false)
    setBrowseRevision((current) => current + 1)
    onBrowse(id)
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
          ref={search}
          type="search"
          placeholder="Najdi třeba volejbal, deskovky nebo běh"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-12 rounded-xl bg-card pl-12 text-base"
        />
      </div>

      <div
        aria-hidden
        ref={shelfStart}
        className="!mb-0 h-0"
      />
      <section
        aria-label="Okruhy aktivit"
        className={cn("relative z-10 space-y-2", isFocused && "sticky -top-px bg-background py-2")}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {isFocused ? (
            <>
              <Button
                ref={switcher}
                type="button"
                variant="outline"
                aria-expanded={isCategoryMenuOpen}
                aria-controls="onboarding-category-choices"
                className="min-h-11 justify-between rounded-full bg-card"
                onClick={() => setCategoryMenuOpen((isOpen) => !isOpen)}
              >
                <Compass aria-hidden />
                Změnit okruh
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "transition-transform motion-reduce:transition-none",
                    isCategoryMenuOpen && "rotate-180",
                  )}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 rounded-full px-3"
                onClick={() => {
                  if (isSearching) setQuery("")
                  setCategoryMenuOpen(false)
                  search.current?.focus()
                }}
              >
                {isSearching ? (
                  "Zrušit hledání"
                ) : (
                  <>
                    <Search aria-hidden /> Hledat
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Prozkoumej okruhy</h2>
              <Button
                type="button"
                variant="link"
                className="min-h-11 px-1"
                onClick={() => browse("")}
              >
                Všechny aktivity
              </Button>
            </>
          )}
        </div>
        <div
          id="onboarding-category-choices"
          hidden={!isCategoryGridShown}
        >
          {isCategoryGridShown ? (
            <div
              className={cn(
                "space-y-3",
                isCategoryMenuOpen &&
                  "hh-wizard-category-reveal max-h-[min(53dvh,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-tile-border bg-card p-2.5 sm:p-3",
              )}
            >
              {isFocused ? (
                <Button
                  type="button"
                  variant={!categoryId && !isSearching ? "secondary" : "outline"}
                  aria-pressed={!categoryId && !isSearching}
                  className="min-h-11"
                  onClick={() => browse("")}
                >
                  Všechny aktivity
                </Button>
              ) : null}
              <div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 xl:grid-cols-4">
                {categories.map((category, index) => (
                  <OnboardingCard
                    key={category.id}
                    name={category.name}
                    photoSlug={coverForCategory(category)}
                    icon={category.icon}
                    kind="category"
                    isSelected={!isSearching && category.id === categoryId}
                    order={index}
                    onSelect={() => browse(category.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section
        aria-labelledby="onboarding-results-heading"
        className="space-y-3"
      >
        <div
          key={isSearching ? "title-search" : `title-${categoryId}`}
          className={cn(
            "relative isolate flex flex-wrap items-end justify-between gap-2 overflow-hidden",
            active &&
              !isSearching &&
              "hh-wizard-category-reveal min-h-27 rounded-2xl bg-hero px-4 pt-10 pb-3 text-on-hero",
          )}
        >
          {!isSearching && cover ? (
            <>
              <img
                src={cover.src}
                alt=""
                className="hh-wizard-category-cover absolute inset-0 -z-20 size-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-linear-to-t from-hero via-hero/70 to-hero/15"
              />
            </>
          ) : null}
          <h2
            id="onboarding-results-heading"
            className="type-card-heading"
          >
            {isSearching ? "Výsledky hledání" : (active?.name ?? "Aktivity napříč okruhy")}
          </h2>
          {isSearching || active || isShowingAll ? (
            <span
              role="status"
              className={cn(
                "text-sm",
                active && !isSearching ? "text-on-hero" : "text-muted-foreground",
              )}
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
            key={isSearching ? "cards-search" : `cards-${categoryId}`}
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
