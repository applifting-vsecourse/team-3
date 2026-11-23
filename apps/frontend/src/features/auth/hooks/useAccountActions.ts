import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { api } from "@/lib/api-client"

import { exportFileName } from "@/features/auth/api/accountApi"
import { authClient } from "@/features/auth/lib/auth-client"

/** Hands the browser a file to save, without leaving the page. */
function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** „Stáhnout moje data“ (#64): GET /api/me/export saved as a JSON file. */
export function useDownloadMyData() {
  return useMutation({
    mutationFn: async () => {
      const blob = await api.get("me/export").blob()
      saveFile(blob, exportFileName(new Date()))
    },
  })
}

export type DeleteAccountInput = { password: string } | { confirmation: string }

/**
 * „Smazat účet“ (#64): DELETE /api/me. The server has ended every session by
 * then; signing out clears the cookie. Then the home page, with every cached
 * query reset (nothing of the account stays in memory) and a toast.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (input: DeleteAccountInput) => {
      await api.delete("me", { json: input })
    },
    onSuccess: async () => {
      // the session is gone already; this only clears its cookie
      await authClient.signOut().catch(() => undefined)
      await navigate({ to: ROUTES.home })
      await queryClient.resetQueries()
      toast.success("Účet je smazaný. Kdykoli se můžeš zaregistrovat znovu.")
    },
  })
}
