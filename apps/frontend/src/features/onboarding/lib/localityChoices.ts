import type { Locality } from "@/lib/catalog/catalogSchemas"
import type { OnlinePlace } from "@/lib/catalog/placeSearch"
import { foldText, matchRank } from "@/lib/catalog/textSearch"

const FEATURED_CITIES = ["praha", "brno", "ostrava", "plzen", "olomouc", "liberec"]
const RESULT_LIMIT = 8
const csNames = new Intl.Collator("cs", { numeric: true })

export type LocalityChoice = {
  key: string
  name: string
  detail?: string
  isExact: boolean
} & ({ locality: Locality } | { onlinePlace: OnlinePlace })

function foldedPlace(text: string) {
  return foldText(text.replace(/[,/]+/g, " ")).replace(/^(mestska cast|obec|mesto) /, "")
}

function localChoice(locality: Locality, detail?: string, isExact = false): LocalityChoice {
  return {
    key: locality.id,
    name: locality.name,
    detail,
    isExact,
    locality,
  }
}

export function browseLocalities(
  catalog: Locality[],
  confirmed?: Locality | null,
  suggested?: Locality | null,
) {
  const featured = new Map(catalog.map((locality) => [locality.slug, locality]))
  const first = confirmed ?? suggested
  const choices = FEATURED_CITIES.flatMap((slug) => {
    const locality = featured.get(slug)
    return locality && locality.id !== first?.id ? [localChoice(locality)] : []
  })
  if (choices.length === 0 && !first) {
    return catalog.slice(0, 6).map((locality) => localChoice(locality))
  }

  return first
    ? [localChoice(first, confirmed ? "Poslední výběr" : "Odhad podle připojení"), ...choices]
    : choices
}

export function findCatalogLocalities(catalog: Locality[], input: string): LocalityChoice[] {
  const needle = foldedPlace(input)
  if (!needle) return []

  const byId = new Map(catalog.map((locality) => [locality.id, locality]))
  const ranked = catalog.flatMap((locality) => {
    const parent = locality.parentId ? byId.get(locality.parentId) : undefined
    const candidates = [foldedPlace(locality.name)]
    if (parent) {
      const town = foldedPlace(parent.name)
      const district = foldedPlace(locality.name)
      const qualified = district.startsWith(town + " ") ? district : `${town} ${district}`
      candidates.push(qualified)
    }
    const rank = Math.min(...candidates.map((name) => matchRank(name, needle) ?? Infinity))
    if (!Number.isFinite(rank)) return []
    return [
      {
        rank,
        choice: localChoice(locality, parent?.name, candidates.includes(needle)),
      },
    ]
  })

  return ranked
    .sort(
      (left, right) =>
        Number(right.choice.isExact) - Number(left.choice.isExact) ||
        left.rank - right.rank ||
        csNames.compare(left.choice.name, right.choice.name),
    )
    .slice(0, RESULT_LIMIT)
    .map(({ choice }) => choice)
}

export function listOnlineLocalities(places: OnlinePlace[], input: string): LocalityChoice[] {
  return places.map((onlinePlace) => ({
    key: onlinePlace.key,
    name: onlinePlace.name,
    detail: onlinePlace.area,
    isExact: foldedPlace(input) === foldedPlace(onlinePlace.name),
    onlinePlace,
  }))
}

export function enterChoice(choices: LocalityChoice[]) {
  const exact = choices.filter((choice) => choice.isExact)
  return exact.length === 1 ? exact[0] : undefined
}
