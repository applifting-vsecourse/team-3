import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { myGroupsSections } from "@/features/groups/lib/myGroups"

/**
 * Moje › Skupiny for the signed-in user (B-056, #304), split into its sections once — for the
 * counts in the band and on the chips, and for the chips themselves.
 */
export function useMyGroups(viewerId: string) {
  // no request under an empty viewer: it would cache the user's groups under the wrong key
  const query = useQuery({ ...myGroupsQueryOptions(viewerId), enabled: viewerId !== "" })
  const sections = useMemo(
    () => (query.data ? myGroupsSections(query.data) : undefined),
    [query.data],
  )
  return {
    groups: query.data,
    sections,
    isPending: query.isPending,
    error: query.error ?? undefined,
    retry: () => void query.refetch(),
  }
}
