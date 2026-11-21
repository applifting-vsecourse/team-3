import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { profileKeys } from "@/features/profile/api/profileQueryOptions"
import { profileSchema, type ProfileInput } from "@/features/profile/api/profileSchemas"
import { profileUpload, type PhotoChange } from "@/features/profile/api/profileUpload"

export function useSaveProfile(viewerId: string, onSaved?: () => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfileInput | { settings: ProfileInput; photo: PhotoChange }) => {
      const request =
        "photo" in input
          ? api.patch("me/profile/details", { body: profileUpload(input.settings, input.photo) })
          : api.patch("me/profile", { json: input })
      return profileSchema.parse(await request.json())
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.self(viewerId), profile)
      await queryClient.invalidateQueries({ queryKey: profileKeys.overview(viewerId) })
      await onSaved?.()
    },
  })
}
