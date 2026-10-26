import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { toAuthRequestError } from "@/features/auth/lib/auth-errors"
import { afterVerificationUrl } from "@/features/auth/lib/callback-url"

export type SignUpInput = {
  name: string
  email: string
  password: string
  /** #153: the API refuses a sign-up without both, and notes when it happened. */
  termsAccepted: boolean
  privacyAcknowledged: boolean
  /** The page the sign-up started from; the verification link leads back there. */
  from?: string
}

type SignUpEmailBody = Parameters<typeof authClient.signUp.email>[0]

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      // BetterAuth handles the whole flow (and signs the user in by default)
      // no username (B-010: name, e-mail, password); the column is optional
      // the client's type knows only BetterAuth's own fields, not our consents
      const body: SignUpEmailBody & Pick<SignUpInput, "termsAccepted" | "privacyAcknowledged"> = {
        name: input.name,
        email: input.email,
        password: input.password,
        termsAccepted: input.termsAccepted,
        privacyAcknowledged: input.privacyAcknowledged,
        // where the link in the verification e-mail leads back to
        callbackURL: afterVerificationUrl(input.from),
      }
      const { error } = await authClient.signUp.email(body)
      if (error) throw toAuthRequestError(error, "Registrace se nepovedla. Zkus to prosím znovu.")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
