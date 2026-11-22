import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { profileKeys } from "@/features/profile/api/profileQueryOptions"
import { profileSchema, type ProfileInput } from "@/features/profile/api/profileSchemas"

export function useSaveProfile(viewerId: string, onSaved?: () => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfileInput) =>
      profileSchema.parse(await api.patch("me/profile", { json: input }).json()),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.self(viewerId), profile)
      await queryClient.invalidateQueries({ queryKey: profileKeys.overview(viewerId) })
      await onSaved?.()
    },
  })
}
