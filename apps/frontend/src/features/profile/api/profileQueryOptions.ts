import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { profileOverviewSchema, profileSchema } from "./profileSchemas"

// Private data is keyed by the actual owner, not just by "signed in".
export const profileKeys = {
  self: (viewerId: string) => ["profile", "self", viewerId] as const,
  overview: (viewerId: string) => ["profile", "overview", viewerId] as const,
}
export const profileQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: profileKeys.self(viewerId),
    queryFn: async () => profileSchema.parse(await api.get("me/profile").json()),
  })
export const profileOverviewQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: profileKeys.overview(viewerId),
    queryFn: async () => profileOverviewSchema.parse(await api.get("me/profile/overview").json()),
  })
