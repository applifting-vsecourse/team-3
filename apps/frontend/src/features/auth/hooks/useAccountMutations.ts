import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { toAuthRequestError } from "@/features/auth/lib/auth-errors"
import { afterVerificationUrl } from "@/features/auth/lib/callback-url"

export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      const result = await authClient
        .changePassword({ ...input, revokeOtherSessions: true })
        .catch(() => {
          throw new Error("Heslo se nepodařilo změnit. Zkontroluj připojení a zkus to znovu.")
        })
      if (result.error) {
        throw toAuthRequestError(
          result.error,
          "Heslo se nepodařilo změnit. Zkontroluj původní heslo a zkus to znovu.",
        )
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.session() }),
  })
}
export function useChangeEmail() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const result = await authClient
        .changeEmail({ newEmail, callbackURL: afterVerificationUrl("/profil") })
        .catch(() => {
          throw new Error(
            "Ověřovací e-mail se nepodařilo odeslat. Zkontroluj připojení a zkus to znovu.",
          )
        })
      if (result.error) {
        throw toAuthRequestError(
          result.error,
          "O změnu e-mailu se nepodařilo požádat. Přihlas se znovu a zkus to ještě jednou.",
        )
      }
      // The old e-mail stays in the profile until BetterAuth verifies the new one.
    },
  })
}
