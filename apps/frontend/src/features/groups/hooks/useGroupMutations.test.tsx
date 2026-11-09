import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useJoinGroup, useLeaveGroup } from "@/features/groups/hooks/useGroupMutations"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn() },
}))

describe("joining or leaving a group", () => {
  it.each([
    ["join", useJoinGroup],
    ["leave", useLeaveGroup],
  ])(
    "%s refreshes the landing page's „Tyhle skupiny rozšiřují partu“",
    async (_, useMutationHook) => {
      vi.mocked(api.post).mockReturnValue({ json: () => Promise.resolve({}) } as never)
      const queryClient = new QueryClient()
      const invalidate = vi.spyOn(queryClient, "invalidateQueries")
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
      const { result } = renderHook(() => useMutationHook("g1"), { wrapper })

      await act(() => result.current.mutateAsync(undefined))

      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "list", "home"] })
    },
  )
})
