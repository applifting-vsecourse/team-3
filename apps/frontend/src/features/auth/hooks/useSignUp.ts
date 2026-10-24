import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { afterVerificationUrl } from "@/features/auth/lib/callback-url"

export type SignUpInput = {
  name: string
  username: string
  email: string
  password: string
}

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      // BetterAuth handles the whole flow (and signs the user in by default)
      const { error } = await authClient.signUp.email({
        name: input.name,
        username: input.username,
        email: input.email,
        password: input.password,
        // where the link in the verification e-mail leads back to
        callbackURL: afterVerificationUrl(),
      })
      if (error) throw new Error(error.message ?? "Sign up failed")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
