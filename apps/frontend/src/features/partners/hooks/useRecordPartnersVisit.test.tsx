import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { partnersKeys } from "@/features/partners/api/partnersQueryOptions"
import { useRecordPartnersVisit } from "@/features/partners/hooks/usePartnerActions"

const { api } = vi.hoisted(() => ({ api: { post: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

describe("useRecordPartnersVisit (#474)", () => {
  it("records the visit to /partaci on the server once and refreshes the landing page's block", async () => {
    api.post.mockResolvedValue({})
    const queryClient = new QueryClient()
    queryClient.setQueryData(partnersKeys.home("me"), { isShown: true, items: [] })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { rerender } = renderHook(() => useRecordPartnersVisit("me"), { wrapper })
    rerender()

    await waitFor(() =>
      expect(queryClient.getQueryState(partnersKeys.home("me"))?.isInvalidated).toBe(true),
    )
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith("partners/visit")
  })
})
