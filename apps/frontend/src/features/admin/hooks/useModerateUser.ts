import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { adminKeys } from "@/features/admin/api/adminApi"

const adminUserPath = (userId: string, action: "block" | "unblock") =>
  `admin/users/${encodeURIComponent(userId)}/${action}`

/**
 * POST /api/admin/users/:id/block with the required reason (PO 26. 11.). `onChanged` lets the
 * page read again what depends on it (the profile is gone for others once blocked).
 */
export function useBlockUser(userId: string, onChanged?: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reason: string) => {
      await api.post(adminUserPath(userId, "block"), { json: { reason } })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.all() })
      await onChanged?.()
    },
  })
}

/** POST /api/admin/users/:id/unblock. */
export function useUnblockUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.post(adminUserPath(userId, "unblock"))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.all() }),
  })
}
