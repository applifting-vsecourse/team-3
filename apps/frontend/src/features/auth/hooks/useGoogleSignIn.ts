import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { GOOGLE_SIGN_IN_FAILED, toAuthRequestError } from "@/features/auth/lib/auth-errors"
import { googleCallbackUrls } from "@/features/auth/lib/callback-url"

/**
 * #154: off to Google. BetterAuth answers with Google's address and the
 * client goes there, so on success the page is left (and stays pending till
 * then); it comes back signed in to `from`, or to /login with `?error=`.
 */
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async (from?: string) => {
      const { error } = await authClient.signIn.social({
        provider: "google",
        ...googleCallbackUrls(from),
      })
      if (error) throw toAuthRequestError(error, GOOGLE_SIGN_IN_FAILED)
    },
  })
}
