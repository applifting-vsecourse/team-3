import { useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"

import { localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import { defaultLocalityQueryOptions } from "@/lib/catalog/defaultLocality"
import { ALL_LOCALITIES_SLUG } from "@/lib/catalog/localityOptions"
import {
  forgetLocality,
  getRememberedLocality,
  rememberLocality,
  subscribeRememberedLocality,
} from "@/lib/catalog/rememberedLocality"

/** Why the lists show the locality they show. */
export type LocalitySource = "url" | "remembered" | "home" | "ip" | "none"

export type LocalityState = {
  /** The locality's slug, or Celé Česko; undefined until the default is known. */
  slug: string | undefined
  source: LocalitySource | undefined
  /** Picked by the visitor (in the URL or remembered), so „Zrušit vše“ has it to clear. */
  isPicked: boolean
  /** A pick in a filter: remembered in this browser. */
  pick: (slug: string) => void
  /** „Zrušit vše“: back to the default. */
  forget: () => void
}

/**
 * The locality /akce, /skupiny and the landing page show (#55): the one in
 * the URL, else the one picked earlier in this browser, else the default —
 * home locality from the profile → a guess from the IP → all of Czechia.
 *
 * @param urlSlug `?lokalita=` of the page, if it has one
 * @param userId the signed-in user's id, null for a visitor, undefined while
 *   the session loads (the default waits for it, so it can't swap)
 */
export function useLocality(
  urlSlug: string | undefined,
  userId: string | null | undefined,
): LocalityState {
  const stored = useSyncExternalStore(
    subscribeRememberedLocality,
    getRememberedLocality,
    () => undefined,
  )
  // A remembered locality the catalog no longer has (removed, renamed) would leave the chip
  // naming nothing and the list for all of Czechia: it counts as no pick. Until the catalog
  // has loaded it holds — the lists wait for the catalog anyway.
  const localities = useQuery({
    ...localitiesQueryOptions(),
    enabled: urlSlug === undefined && stored !== undefined,
  })
  const remembered =
    stored === undefined ||
    stored === ALL_LOCALITIES_SLUG ||
    !localities.data ||
    localities.data.some((locality) => locality.slug === stored)
      ? stored
      : undefined
  const isPicked = urlSlug !== undefined || remembered !== undefined
  const defaultQuery = useQuery({
    ...defaultLocalityQueryOptions(userId ?? null),
    enabled: userId !== undefined && !isPicked,
  })

  const fallback = defaultQuery.data
    ? (defaultQuery.data.locality?.slug ?? ALL_LOCALITIES_SLUG)
    : defaultQuery.isError
      ? ALL_LOCALITIES_SLUG
      : undefined

  return {
    slug: urlSlug ?? remembered ?? fallback,
    source:
      urlSlug !== undefined
        ? "url"
        : remembered !== undefined
          ? "remembered"
          : (defaultQuery.data?.source ?? (defaultQuery.isError ? "none" : undefined)),
    isPicked,
    pick: rememberLocality,
    forget: forgetLocality,
  }
}
