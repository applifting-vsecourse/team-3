import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { afterVerificationUrl } from "@/features/auth/lib/callback-url"

/** Sends a new verification link (it works for 24 hours, B-011). */
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: afterVerificationUrl(),
      })
      if (error) throw new Error(error.message ?? "Odkaz se nepodařilo odeslat")
    },
  })
}
