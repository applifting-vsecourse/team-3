import { useQuery } from "@tanstack/react-query"

import { useCatalog } from "@/hooks/useCatalog"

import { groupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { toGroupFilters, type GroupsSearch } from "@/features/groups/lib/groupsSearch"

/**
 * Groups for the given URL filters. The list and a filter panel's
 * „Zobrazit N skupin“ preview both use it, so they share the cache.
 * `isEnabled: false` (a closed panel) fetches nothing.
 */
export function useGroups(search: GroupsSearch, { isEnabled = true } = {}) {
  const { catalog, queries } = useCatalog()
  const groupsQuery = useQuery(
    groupsQueryOptions(catalog && isEnabled ? toGroupFilters(search, catalog) : undefined),
  )
  const all = [...queries, groupsQuery]
  return {
    groups: groupsQuery.data,
    /** The shown groups belong to the previous filters while the new ones load. */
    isPlaceholderData: groupsQuery.isPlaceholderData,
    catalog,
    isPending: all.some((query) => query.isPending),
    error: all.find((query) => query.error)?.error ?? undefined,
    // Only what failed: a working catalog doesn't need to be fetched again.
    retry: () => {
      for (const query of all) if (query.error) void query.refetch()
    },
  }
}
