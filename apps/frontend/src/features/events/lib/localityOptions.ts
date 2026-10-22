import type { Locality } from "@/features/events/api/catalogSchemas"
import { DEFAULT_LOCALITY_SLUG } from "@/features/events/lib/eventsSearch"

export type LocalityOption = Locality & { isDistrict: boolean }

const collator = new Intl.Collator("cs", { numeric: true })

/**
 * Localities for the picker: each city followed by its districts, the default
 * (Praha) first, then other cities alphabetically; districts in natural order
 * („Praha 2“ before „Praha 10“).
 */
export function localityOptions(localities: Locality[]): LocalityOption[] {
  const cities = localities
    .filter((l) => l.parentId === null)
    .sort(
      (a, b) =>
        Number(b.slug === DEFAULT_LOCALITY_SLUG) - Number(a.slug === DEFAULT_LOCALITY_SLUG) ||
        collator.compare(a.name, b.name),
    )
  return cities.flatMap((city) => [
    { ...city, isDistrict: false },
    ...localities
      .filter((l) => l.parentId === city.id)
      .sort((a, b) => collator.compare(a.name, b.name))
      .map((district) => ({ ...district, isDistrict: true })),
  ])
}
