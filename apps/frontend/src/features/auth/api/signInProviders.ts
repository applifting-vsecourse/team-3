import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"
import { authKeys } from "@/lib/auth-keys"

/**
 * GET /api/sign-in-providers (#154): what the sign-in pages offer besides
 * e-mail and password. Google only once the server has its keys.
 */
export const signInProvidersSchema = z.object({ google: z.boolean() })

export type SignInProviders = z.infer<typeof signInProvidersSchema>

export const signInProvidersQueryOptions = () =>
  queryOptions({
    queryKey: [...authKeys.all(), "sign-in-providers"],
    queryFn: async () => signInProvidersSchema.parse(await api.get("sign-in-providers").json()),
    // set when the server starts: asking again on focus won't change it
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // an answer that doesn't come means no Google, not an error page
    retry: false,
  })
