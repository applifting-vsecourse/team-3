import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  groupDetailSchema,
  groupMembersSchema,
  groupsSchema,
  myGroupsSchema,
  type GroupFilters,
} from "@/features/groups/api/groupSchemas"

export const groupKeys = {
  all: () => ["groups"] as const,
  lists: () => [...groupKeys.all(), "list"] as const,
  list: (filters: GroupFilters | undefined) => [...groupKeys.lists(), filters] as const,
  // under lists(): joining, leaving and deciding requests refresh it with the other lists
  mine: (viewerId: string) => [...groupKeys.lists(), "mine", viewerId] as const,
  details: () => [...groupKeys.all(), "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  members: (id: string) => [...groupKeys.detail(id), "members"] as const,
}

// Repeated keys (activityId=a&activityId=b) — the API doesn't take activityId[].
export const toSearchParams = (filters: GroupFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters.localityId) params.set("localityId", filters.localityId)
  for (const id of filters.activityIds) params.append("activityId", id)
  for (const id of filters.categoryIds) params.append("categoryId", id)
  return params
}

/** `filters` is undefined until the catalog has resolved the URL's slugs to ids. */
export const groupsQueryOptions = (filters: GroupFilters | undefined) =>
  queryOptions({
    queryKey: groupKeys.list(filters),
    queryFn: filters
      ? async () =>
          groupsSchema.parse(
            await api.get("groups", { searchParams: toSearchParams(filters) }).json(),
          )
      : skipToken,
    // Keep the current list on screen while a changed filter loads.
    placeholderData: keepPreviousData,
  })

/**
 * The group as the viewer sees it: the answer carries their own membership,
 * so the viewer is part of the key (signing in or out refetches). `viewerId`
 * is undefined while the session loads, then nothing is fetched yet; null is
 * a visitor.
 */
export const groupQueryOptions = (id: string, viewerId: string | null | undefined) =>
  queryOptions({
    queryKey: [...groupKeys.detail(id), "viewer", viewerId ?? null] as const,
    queryFn:
      viewerId === undefined
        ? skipToken
        : async () => groupDetailSchema.parse(await api.get(`groups/${id}`).json()),
  })

/** Requests and members for the group's management; the API answers 403 to anyone but an admin. */
export const groupMembersQueryOptions = (id: string, { isEnabled = true } = {}) =>
  queryOptions({
    queryKey: groupKeys.members(id),
    queryFn: isEnabled
      ? async () => groupMembersSchema.parse(await api.get(`groups/${id}/members`).json())
      : skipToken,
  })

/** „Moje“ on /skupiny (B-056); the viewer is in the key, so another account doesn't see them. */
export const myGroupsQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: groupKeys.mine(viewerId),
    queryFn: async () => myGroupsSchema.parse(await api.get("me/groups").json()),
  })
