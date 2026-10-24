import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { toAuthRequestError } from "@/features/auth/lib/auth-errors"
import { afterVerificationUrl } from "@/features/auth/lib/callback-url"

export type SignUpInput = {
  name: string
  email: string
  password: string
  /** The page the sign-up started from; the verification link leads back there. */
  from?: string
}

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      // BetterAuth handles the whole flow (and signs the user in by default)
      // no username (B-010: name, e-mail, password); the column is optional
      const { error } = await authClient.signUp.email({
        name: input.name,
        email: input.email,
        password: input.password,
        // where the link in the verification e-mail leads back to
        callbackURL: afterVerificationUrl(input.from),
      })
      if (error) throw toAuthRequestError(error, "Registrace se nepovedla. Zkuste to prosím znovu.")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
