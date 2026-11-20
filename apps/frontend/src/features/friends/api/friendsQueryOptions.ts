import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { friendListsSchema } from "./friendsSchemas"

// private data: keyed by its owner, so nobody else gets it from the cache
export const friendsKeys = {
  all: () => ["friends"] as const,
  lists: (viewerId: string) => [...friendsKeys.all(), "lists", viewerId] as const,
}

/** „Lidé, které znám“: friends, requests waiting for me, my requests (#307). */
export const friendListsQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: friendsKeys.lists(viewerId),
    queryFn: async () => friendListsSchema.parse(await api.get("friends").json()),
  })
