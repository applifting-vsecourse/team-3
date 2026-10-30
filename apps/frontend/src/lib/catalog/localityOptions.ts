import type { Locality } from "@/lib/catalog/catalogSchemas"

/** Lists without ?lokalita= show Praha; Praha is the default, not an active filter. */
export const DEFAULT_LOCALITY_SLUG = "praha"

/** `?lokalita=cele-cesko`: no locality filter, the whole catalog of Czechia. */
export const ALL_LOCALITIES_SLUG = "cele-cesko"
export const ALL_LOCALITIES_NAME = "Celé Česko"

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

/** What the chip says for a slug: „Celé Česko“, the locality's name, or nothing for a slug the catalog doesn't know. */
export const localityName = (slug: string, localities: Locality[]): string | undefined =>
  slug === ALL_LOCALITIES_SLUG ? ALL_LOCALITIES_NAME : localities.find((l) => l.slug === slug)?.name

// Spelled out per city, so no grammatical gender is guessed from a name.
const WHOLE_CITY: Record<string, string> = { praha: "Celá Praha" }

/**
 * The locality panel's reset for what is picked: a district goes back to its
 * whole city („Celá Praha“, „Celé město Brno“), a city or a town to all of
 * Czechia („Zrušit výběr“, like the activity filter's). Celé Česko has
 * nothing to reset, so its `slug` is undefined.
 */
export function localityReset(
  slug: string,
  localities: Locality[],
): { label: string; slug: string | undefined } {
  const parentId = localities.find((l) => l.slug === slug)?.parentId
  const city = parentId ? localities.find((l) => l.id === parentId) : undefined
  if (city) return { label: WHOLE_CITY[city.slug] ?? `Celé město ${city.name}`, slug: city.slug }
  return {
    label: "Zrušit výběr",
    slug: slug === ALL_LOCALITIES_SLUG ? undefined : ALL_LOCALITIES_SLUG,
  }
}
