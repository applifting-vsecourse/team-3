import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import {
  initialMyGroupsTab,
  myGroupsSections,
  type MyGroupsTabName,
} from "@/features/groups/lib/myGroups"

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

export type MyGroupsQuery = ReturnType<typeof useMyGroups>

/**
 * The chip Moje › Skupiny shows (#304, as Moje › Akce in #188): the one in the URL, else the one
 * `initialMyGroupsTab` picks for this visit — once, when the groups first come: a refetch after
 * another admin decided the last request doesn't move the user to the other chip (review #318).
 * Groups that failed to load show Jsem členem, which says so and offers „Zkusit znovu“ — without
 * keeping it: after a retry the first real data pick (review #318). Undefined until then, so Jsem
 * členem never flashes before Spravuju.
 */
export function useMyGroupsTab(
  urlTab: MyGroupsTabName | undefined,
  { sections, error }: Pick<MyGroupsQuery, "sections" | "error">,
): MyGroupsTabName | undefined {
  const [picked, setPicked] = useState<MyGroupsTabName>()
  const candidate = picked ?? (sections ? initialMyGroupsTab(sections) : undefined)
  // React's „storing information from previous renders“: set once, during the render
  if (picked === undefined && candidate !== undefined) setPicked(candidate)
  return urlTab ?? candidate ?? (error ? "clen" : undefined)
}
