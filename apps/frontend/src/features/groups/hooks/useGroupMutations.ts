import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { groupDetailSchema, type GroupInput } from "@/features/groups/api/groupSchemas"
import { groupKeys } from "@/features/groups/api/groupsQueryOptions"

/** POST /api/groups; the signed-in founder becomes the group's admin. */
export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GroupInput) =>
      groupDetailSchema.parse(await api.post("groups", { json: input }).json()),
    onSuccess: (group) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(group.id) }),
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() }),
      ]),
  })
}

/** PATCH /api/groups/:id; the API answers 403 to anyone but an admin. */
export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GroupInput) =>
      groupDetailSchema.parse(await api.patch(`groups/${id}`, { json: input }).json()),
    onSuccess: (group) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(group.id) }),
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() }),
      ]),
  })
}

/**
 * Membership changes move the group's counts and the viewer's state, so the
 * detail (with its members) and the lists refetch.
 */
function useMembershipMutation<Variables = void>(
  groupId: string,
  request: (variables: Variables) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() }),
      ]),
  })
}

/** „Přidat se“ (public: a member at once) or „Požádat o členství“ (closed: a request). */
export const useJoinGroup = (groupId: string) =>
  useMembershipMutation(groupId, () => api.post(`groups/${groupId}/join`).json())

/** „Odejít ze skupiny“; the last admin gets LAST_ADMIN. */
export const useLeaveGroup = (groupId: string) =>
  useMembershipMutation(groupId, () => api.post(`groups/${groupId}/leave`))

/** An admin approves or rejects a request (D-07); rejecting removes it. */
export const useDecideRequest = (groupId: string) =>
  useMembershipMutation(
    groupId,
    ({ userId, decision }: { userId: string; decision: "approve" | "reject" }) =>
      api.post(`groups/${groupId}/requests/${userId}/${decision}`),
  )
