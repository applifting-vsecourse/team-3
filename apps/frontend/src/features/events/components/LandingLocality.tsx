import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import { localityDefault, type LocalityState } from "@/hooks/useLocality"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { localityName } from "@/lib/catalog/localityOptions"

type LandingLocalityProps = {
  /** The landing page's locality (useLocality, #55); its slug is known once this renders. */
  locality: LocalityState & { slug: string }
  localities: Locality[]
  /** The sections are the nearest events: nothing in the locality to join (GET /api/home, #299). */
  isWidened: boolean
  /**
   * The locality has events at all, full ones or the viewer's own included (GET /api/home): then
   * it is not „empty“, there is just nothing in it to join.
   */
  hasLocalityEvents: boolean
  /** Some of the nearest events can be joined: the sections show them (review #321). */
  hasNearestEvents: boolean
  /** A pick in the chip (remembered in this browser, #55). */
  onChange: (slug: string) => void
  /** „Zrušit výběr“: back to the visitor's default. */
  onReset: () => void
}

/**
 * Which locality the landing page is for (#299): the sections used to follow a guess from the IP
 * nobody could see. The same chip as on /akce — „Police nad Metují · odhad“ with its × — and,
 * when the locality has nothing, that the sections are the nearest events instead.
 */
export function LandingLocality({
  locality,
  localities,
  isWidened,
  hasLocalityEvents,
  hasNearestEvents,
  onChange,
  onReset,
}: LandingLocalityProps) {
  const record = localities.find((l) => l.slug === locality.slug)
  const name = localityName(locality.slug, localities)
  // a district's sections cover its whole city (B-027): „v okolí lokality Praha 3“
  const where = record?.parentId ? "V okolí lokality" : "V lokalitě"
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-sm text-muted-foreground">
        {isWidened && name && !hasNearestEvents ? (
          // nothing near to join either: no neutral line over nothing (review #321)
          <>
            {where} <span className="font-semibold text-foreground">{name}</span> ani v okolí teď
            není akce, kam se dá přidat.
          </>
        ) : isWidened && name ? (
          // „žádná akce není“ only when it is true: full events and one's own leave no section
          // either, and an organizer must not read that their own town is empty (review #321)
          <>
            {where} <span className="font-semibold text-foreground">{name}</span>{" "}
            {hasLocalityEvents ? "teď není akce, kam se dá přidat." : "teď žádná akce není."}{" "}
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
