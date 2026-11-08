import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"
import { localitySchema } from "@/lib/catalog/catalogSchemas"

/** GET /api/geo/locality: null = all of Czechia (#55). */
export const defaultLocalitySchema = z.object({
  locality: localitySchema.nullable(),
  // home = from the profile, ip = guessed from the IP address
  source: z.enum(["home", "ip", "none"]),
})

export type DefaultLocality = z.infer<typeof defaultLocalitySchema>

/**
 * Per viewer: the home locality differs after signing in or out, so the key
 * has the user. Kept for the session only, never written to the browser's
 * storage — the guess isn't stored anywhere (#55).
 */
export const defaultLocalityQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ["geo", "locality", userId] as const,
    queryFn: async () => defaultLocalitySchema.parse(await api.get("geo/locality").json()),
    staleTime: Infinity,
    // a failed guess is all of Czechia, not an error to retry
    retry: false,
  })
