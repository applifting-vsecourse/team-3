import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import { localityDefault, type LocalityState } from "@/hooks/useLocality"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { ALL_LOCALITIES_SLUG, localityName } from "@/lib/catalog/localityOptions"

import type { Home } from "@/features/events/api/homeSchemas"

type LandingLocalityProps = {
  /** The landing page's locality as the visitor has it (useLocality, #55). */
  state: LocalityState
  /** GET /api/home: the locality the sections are really for, and whether they were widened. */
  home: Home
  localities: Locality[]
  /**
   * `home` is the previous locality's while the new one loads (keepPreviousData): the chip then
   * shows the visitor's new choice, the line stays neutral.
   */
  isUpdating?: boolean
  /** A pick in the chip (remembered in this browser, #55). */
  onChange: (slug: string) => void
  /** „Zrušit výběr“: back to the visitor's default. */
  onReset: () => void
}

/**
 * The chip's state: the locality the API answered for, never one the sections are not for
 * (DESIGN.md › Locality chip, review #321) — an unknown `?lokalita=` or a failed guess gets the
 * home locality's sections, and the chip names that. A pick or a guess the API took stays as it is.
 */
export function shownLocality(state: LocalityState, home: Home): LocalityState & { slug: string } {
  const slug = home.locality?.slug ?? ALL_LOCALITIES_SLUG
  if (slug === state.slug) return { ...state, slug }
  return {
    ...state,
    slug,
    isPicked: false,
    source: home.locality?.source === "profile" ? "home" : "none",
  }
}

/**
 * Which locality the landing page is for (#299): the sections used to follow a guess from the IP
 * nobody could see. The same chip as on /akce — „Police nad Metují · odhad“ with its × — and,
 * when the locality has nothing to join, that the sections are the nearest events instead.
 */
export function LandingLocality({
  state,
  home,
  localities,
  isUpdating = false,
  onChange,
  onReset,
}: LandingLocalityProps) {
  const locality =
    isUpdating && state.slug !== undefined
      ? { ...state, slug: state.slug }
      : shownLocality(state, home)
  const record = localities.find((l) => l.slug === locality.slug)
  const name = localityName(locality.slug, localities)
  // a district's sections cover its whole city (B-027): „v okolí lokality Praha 3“
  const where = record?.parentId ? "V okolí lokality" : "V lokalitě"
  const hasNearestEvents = home.sections.some((section) => "events" in section)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-sm text-muted-foreground">
        {isUpdating ? (
          "Ukazujeme akce pro lokalitu"
        ) : home.isWidened && name && !hasNearestEvents ? (
          // nothing near to join either: no neutral line over nothing (review #321)
          <>
            {where} <span className="font-semibold text-foreground">{name}</span> ani v okolí teď
            není akce, kam se dá přidat.
          </>
        ) : home.isWidened && name ? (
          // „žádná akce není“ only when it is true: full events and one's own leave no section
          // either, and an organizer must not read that their own town is empty (review #321)
          <>
            {where} <span className="font-semibold text-foreground">{name}</span>{" "}
            {home.hasLocalityEvents ? "teď není akce, kam se dá přidat." : "teď žádná akce není."}{" "}
            Ukazujeme nejbližší akce v okolí.
          </>
        ) : (
          "Ukazujeme akce pro lokalitu"
        )}
      </p>
      <LocalityFilter
        value={locality.slug}
        localities={localities}
        onChange={onChange}
        applyLabel="Zobrazit akce"
        localityDefault={localityDefault(locality, onReset, onChange)}
      />
    </div>
  )
}
