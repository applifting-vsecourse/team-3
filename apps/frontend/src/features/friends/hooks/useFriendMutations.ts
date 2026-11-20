import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { friendsKeys } from "@/features/friends/api/friendsQueryOptions"
import { friendshipChangeSchema, type FriendshipState } from "@/features/friends/api/friendsSchemas"

const friendPath = (userId: string) => `friends/${encodeURIComponent(userId)}`

type Change = "request" | "reject" | "remove"

const send = async (change: Change, userId: string): Promise<FriendshipState> => {
  const response =
    change === "request"
      ? api.post(friendPath(userId))
      : change === "reject"
        ? api.patch(friendPath(userId), { json: { status: "rejected" } })
        : api.delete(friendPath(userId))
  return friendshipChangeSchema.parse(await response.json()).state
}

/**
 * The friendship changes (#307), each answering how the viewer stands to the other afterwards:
 * „Přidat do přátel“ (a request, or accepting theirs), „Odmítnout“ (quietly), „Zrušit žádost“
 * or „Odebrat z přátel“. The lists refresh either way — also after a refusal, when another tab
 * changed things. `onSettled` lets the route refresh what another feature shows (the public
 * profile's button and Kam jde): a feature doesn't reach into another one.
 */
export function useFriendshipChange(change: Change, onSettled?: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => send(change, userId),
    onSettled: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: friendsKeys.all() }), onSettled?.()]),
  })
}
