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
    onSuccess: (group) => {
      queryClient.setQueryData(groupKeys.detail(group.id), group)
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}

/** PATCH /api/groups/:id; the API answers 403 to anyone but an admin. */
export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GroupInput) =>
      groupDetailSchema.parse(await api.patch(`groups/${id}`, { json: input }).json()),
    onSuccess: (group) => {
      queryClient.setQueryData(groupKeys.detail(group.id), group)
      void queryClient.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}
