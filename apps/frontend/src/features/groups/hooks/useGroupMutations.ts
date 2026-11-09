import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  announcementSchema,
  groupDetailSchema,
  type AnnouncementInput,
  type GroupInput,
} from "@/features/groups/api/groupSchemas"
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
/**
 * The landing page's sections (#182) — „Tyhle skupiny rozšiřují partu“ leaves out the groups
 * the user is in or waits for. The events feature's `homeKeys.all()`, which a feature can't
 * import from another.
 */
const HOME_KEY = ["events", "list", "home"] as const

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
        queryClient.invalidateQueries({ queryKey: HOME_KEY }),
      ]),
  })
}

/**
 * „Přidat se“ (public: a member at once) or „Požádat o členství“ (closed: a
 * request, which may carry a message for the admins, #175).
 */
export const useJoinGroup = (groupId: string) =>
  useMembershipMutation(groupId, (message?: string | null) =>
    api.post(`groups/${groupId}/join`, { json: message ? { message } : {} }).json(),
  )

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

/**
 * „Deaktivovat skupinu“ (B-051): only an admin; the group becomes read-only
 * and its upcoming events are cancelled (#70), so every event query goes
 * stale too. `["events"]` is the events feature's `eventKeys.all()`, which a
 * feature can't import from another.
 */
export function useDeactivateGroup(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`groups/${groupId}/deactivate`),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
      ]),
  })
}

/**
 * „Napsat členům“ (#194, Figma D-08): only an admin; the members get it by
 * e-mail. The group's announcements refetch, with what is left of today's limit.
 */
export function useSendAnnouncement(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AnnouncementInput) =>
      announcementSchema.parse(
        await api.post(`groups/${groupId}/announcements`, { json: input }).json(),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [...groupKeys.detail(groupId), "announcements"],
      }),
  })
}
