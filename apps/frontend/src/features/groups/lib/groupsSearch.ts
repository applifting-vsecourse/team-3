import { z } from "zod"

import {
  catalogSearchShape,
  hasCatalogFilters,
  toCatalogFilters,
  type Catalog,
} from "@/lib/catalog/catalogSearch"

import type { GroupFilters } from "@/features/groups/api/groupSchemas"

/**
 * Filters of /skupiny in the URL, like /akce: `?lokalita=praha-9&kategorie=hry&aktivita=florbal`.
 * Activity + locality only (PO 19. 10.); no name search in sprint 2.
 */
export const groupsSearchSchema = z.object(catalogSearchShape)

export type GroupsSearch = z.infer<typeof groupsSearchSchema>

/** Whether „Zrušit vše“ has anything to clear. Praha is the default, not a filter. */
export const hasActiveFilters = (search: GroupsSearch): boolean => hasCatalogFilters(search)

export const toGroupFilters = (search: GroupsSearch, catalog: Catalog): GroupFilters =>
  toCatalogFilters(search, catalog)
