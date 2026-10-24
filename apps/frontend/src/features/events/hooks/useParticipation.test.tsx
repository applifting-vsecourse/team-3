import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useJoinEvent } from "@/features/events/hooks/useParticipation"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn(), delete: vi.fn() },
}))

describe("useJoinEvent", () => {
  it("a refusal refetches the detail, so a stale „Přijdu“ turns into „Plno“", async () => {
    const conflict = new HTTPError(
      new Response(null, { status: 409 }),
      new Request("http://localhost:4050/api/events/e1/participation"),
      {} as never,
    )
    vi.mocked(api.post).mockReturnValue({ json: () => Promise.reject(conflict) } as never)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useJoinEvent("e1", "u9"), { wrapper })

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "detail", "e1", "u9"] })
  })
})
