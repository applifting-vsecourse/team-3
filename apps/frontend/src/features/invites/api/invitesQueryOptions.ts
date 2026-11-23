import { queryOptions } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { inviterSchema, myInviteSchema, type Inviter } from "./invitesSchemas"

export const inviteKeys = {
  all: () => ["invites"] as const,
  // private: keyed by its owner, so nobody else gets it from the cache
  mine: (viewerId: string) => [...inviteKeys.all(), "mine", viewerId] as const,
  inviter: (code: string) => [...inviteKeys.all(), "inviter", code] as const,
}

/** „Pozvi kamaráda“ on Můj profil: my link (#406). */
export const myInviteQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: inviteKeys.mine(viewerId),
    queryFn: async () => myInviteSchema.parse(await api.get("invites/me").json()),
  })

/**
 * Who invites (#406). An invalid, replaced or foreign code, or a blocked or deleted inviter,
 * is `null`: nothing is shown and nothing blocks the sign-up.
 */
export const inviterQueryOptions = (code: string) =>
  queryOptions({
    queryKey: inviteKeys.inviter(code),
    queryFn: async (): Promise<Inviter | null> => {
      try {
        return inviterSchema.parse(await api.get(`invites/${encodeURIComponent(code)}`).json())
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 404) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  })
