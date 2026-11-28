import { useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { partnersKeys } from "@/features/partners/api/partnersQueryOptions"
import { partnerRequestSchema } from "@/features/partners/api/partnersSchemas"

const partnerPath = (userId: string, action: "request" | "skip") =>
  `partners/${encodeURIComponent(userId)}/${action}`

/**
 * „Přidat“: a friendship request, or accepting theirs — the match (#84). The deck doesn't wait
 * for the answer; a failure brings the card back. `onSettled` lets the route refresh what the
 * friends feature shows: a feature doesn't reach into another one.
 */
export function usePartnerRequest(onSettled?: () => Promise<unknown>) {
  return useMutation({
    mutationFn: async (userId: string) =>
      partnerRequestSchema.parse(await api.post(partnerPath(userId, "request")).json()),
    onSettled: () => onSettled?.(),
  })
}

/** „Teď ne“: the person doesn't come back for 90 days, on any device. */
export function usePartnerSkip() {
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.post(partnerPath(userId, "skip"))
    },
  })
}

/** „Vrátit“: forgets the last skip. */
export function usePartnerUnskip() {
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(partnerPath(userId, "skip"))
    },
  })
}

/**
 * „Ukázat mě“: turns „Ukazovat mě v Najdi parťáka“ back on and loads the deck again.
 * `onSettled` lets the route refresh the profile, which another feature shows.
 */
export function useShowMe(onSettled?: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.patch("me/profile", { json: { partnerDiscoverable: true } })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partnersKeys.all() }),
    onSettled: () => onSettled?.(),
  })
}

/**
 * /partaci opened (#474): the server remembers the visit, and „Parťáci v okolí“ stay off the
 * landing page for 7 days on every device. Once per opening of the page.
 */
export function useRecordPartnersVisit(viewerId: string | undefined) {
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: async (_viewerId: string) => {
      await api.post("partners/visit")
    },
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: partnersKeys.home(id) }),
  })
  useEffect(() => {
    // the session is there by then (protected layout); once per user and opening of the page
    if (viewerId) mutate(viewerId)
  }, [mutate, viewerId])
}

/** „Skrýt“ on the landing page (#474): 30 days without the block, on every device. */
export function useHidePartnersHome(viewerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post("partners/home/hide")
    },
    onSuccess: () =>
      queryClient.setQueryData(partnersKeys.home(viewerId), { isShown: false, items: [] }),
  })
}
