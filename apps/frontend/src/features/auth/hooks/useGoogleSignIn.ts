import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { GOOGLE_SIGN_IN_FAILED, toAuthRequestError } from "@/features/auth/lib/auth-errors"
import { googleCallbackUrls, type GooglePage } from "@/features/auth/lib/callback-url"

/**
 * #154: off to Google. BetterAuth answers with Google's address and the
 * client goes there, so on success the page is left (and stays pending till
 * then); it comes back signed in to `from`, or with `?error=` to the page it
 * started on (#198).
 */
export function useGoogleSignIn(startedOn: GooglePage) {
  return useMutation({
    mutationFn: async (from?: string) => {
      const { error } = await authClient.signIn.social({
        provider: "google",
        ...googleCallbackUrls(from, startedOn),
      })
      if (error) throw toAuthRequestError(error, GOOGLE_SIGN_IN_FAILED)
    },
  })
}
