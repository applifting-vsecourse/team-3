import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { inviteKeys } from "@/features/invites/api/invitesQueryOptions"
import { inviteAnswerSchema, myInviteSchema } from "@/features/invites/api/invitesSchemas"

/**
 * The onboarding's answer to „{jméno} tě sem zve“ (#406): `shouldBefriend` = „Přidat do
 * přátel“, friends at once for a newly invited user; „Teď ne“ only lets the inviter know who
 * joined. The friends' lists are another feature's: they load afresh on the next visit.
 */
export function useInviteAnswer(code: string) {
  return useMutation({
    mutationFn: async (shouldBefriend: boolean) =>
      inviteAnswerSchema.parse(
        await api
          .post(`invites/${encodeURIComponent(code)}/accept`, {
            json: { befriend: shouldBefriend },
          })
          .json(),
      ).state,
  })
}

/** „Vytvořit nový odkaz“: the old link stops working at once. */
export function useRegenerateInvite(viewerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => myInviteSchema.parse(await api.post("invites/me/regenerate").json()),
    onSuccess: (invite) => queryClient.setQueryData(inviteKeys.mine(viewerId), invite),
  })
}
