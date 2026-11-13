import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import { localityDefault, type LocalityState } from "@/hooks/useLocality"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { localityName } from "@/lib/catalog/localityOptions"

type LandingLocalityProps = {
  /** The landing page's locality (useLocality, #55); its slug is known once this renders. */
  locality: LocalityState & { slug: string }
  localities: Locality[]
  /** The sections are the nearest events, the locality has none (GET /api/home, #299). */
  isWidened: boolean
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
  onChange,
  onReset,
}: LandingLocalityProps) {
  const name = localityName(locality.slug, localities)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-sm text-muted-foreground">
        {isWidened && name ? (
          <>
            V lokalitě <span className="font-semibold text-foreground">{name}</span> teď žádná akce
            není. Ukazujeme nejbližší akce v okolí.
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
