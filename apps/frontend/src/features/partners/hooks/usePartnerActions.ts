import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

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
