import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

/** GET /api/admin/overview (PO 26. 11.): what the superadmin deactivated or blocked. */
export const adminOverviewSchema = z.object({
  hiddenEvents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startsAt: z.coerce.date(),
      reason: z.string().nullable(),
      hiddenAt: z.coerce.date().nullable(),
    }),
  ),
  blockedUsers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      blockedAt: z.coerce.date(),
      reason: z.string().nullable(),
    }),
  ),
})
export type AdminOverview = z.infer<typeof adminOverviewSchema>

export const adminKeys = {
  all: () => ["admin"] as const,
  overview: (viewerId: string) => [...adminKeys.all(), "overview", viewerId] as const,
}

export const adminOverviewQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: adminKeys.overview(viewerId),
    queryFn: async () => adminOverviewSchema.parse(await api.get("admin/overview").json()),
  })

/** The superadmin, as the session says it; the API decides again (AdminGuard). */
export const isSuperadmin = (user: { role?: string } | null | undefined): boolean =>
  user?.role === "admin"
