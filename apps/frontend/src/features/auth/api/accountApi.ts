import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

/** GET /api/me/account (#64): what deleting the account would do, before anything does. */
export const accountSummarySchema = z.object({
  hasPassword: z.boolean(),
  confirmationPhrase: z.string(),
  groupsRunAlone: z.array(z.object({ id: z.string(), name: z.string() })),
  upcomingOrganizedCount: z.number().int().nonnegative(),
})
export type AccountSummary = z.infer<typeof accountSummarySchema>

// private: keyed by the owner, as the profile is
export const accountKeys = {
  summary: (viewerId: string) => ["account", "summary", viewerId] as const,
}

export const accountSummaryQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: accountKeys.summary(viewerId),
    queryFn: async () => accountSummarySchema.parse(await api.get("me/account").json()),
  })

/** „hobbyhub-moje-data-2026-11-23.json“: the day it was downloaded, in the viewer's time zone. */
export const exportFileName = (now: Date) => {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-")
  return `hobbyhub-moje-data-${day}.json`
}
