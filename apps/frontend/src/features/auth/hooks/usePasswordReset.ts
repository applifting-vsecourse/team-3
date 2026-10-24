import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { toAuthRequestError } from "@/features/auth/lib/auth-errors"

/**
 * Asks for a password-reset link. The backend builds the link to the reset
 * page itself, and answers the same whether or not the e-mail has an account.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.requestPasswordReset({ email })
      if (error) throw toAuthRequestError(error, "Odkaz se nepodařilo odeslat. Zkuste to znovu.")
    },
  })
}

/** Sets the new password with the token from the link; other sessions are signed out. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const { error } = await authClient.resetPassword({ token, newPassword })
      if (error) throw toAuthRequestError(error, "Heslo se nepodařilo změnit. Zkuste to znovu.")
    },
  })
}
