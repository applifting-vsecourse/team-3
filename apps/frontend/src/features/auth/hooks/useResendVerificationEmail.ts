import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { toAuthRequestError } from "@/features/auth/lib/auth-errors"
import { afterVerificationUrl } from "@/features/auth/lib/callback-url"

export type ResendInput = {
  email: string
  /** The page to come back to after verifying, as `resendFrom` gives it. */
  from?: string
}

/**
 * Sends a new verification link (it works for 24 hours, B-011). If the
 * e-mail was verified meanwhile, e.g. in another tab, it refreshes the session
 * instead, so the banner goes away.
 */
export function useResendVerificationEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, from }: ResendInput): Promise<"sent" | "already-verified"> => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        // like the link from the sign-up, it leads back where the user was (B-012)
        callbackURL: afterVerificationUrl(from),
      })
      if (error?.code === "EMAIL_ALREADY_VERIFIED") return "already-verified"
      if (error) throw toAuthRequestError(error, "Odkaz se nepodařilo odeslat. Zkus to znovu.")
      return "sent"
    },
    onSuccess: (result) => {
      if (result === "already-verified") {
        void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      }
    },
  })
}
