import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useJoinEvent, useLeaveEvent } from "@/features/events/hooks/useParticipation"
import { anEventDetail } from "@/features/events/test/anEvent"

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

describe("useLeaveEvent", () => {
  it("the detail's poll, still on its way, doesn't bring a withdrawn request back", async () => {
    // the API answers with the detail as it is now: no participation any more
    vi.mocked(api.delete).mockReturnValue({
      json: () => Promise.resolve(JSON.parse(JSON.stringify(anEventDetail()))),
    } as never)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useLeaveEvent("e1", "u9"), { wrapper })
    let staleBack: (() => void) | undefined
    // a waiting request asks every few seconds (P-C-1); this answer is from before withdrawing
    const detail = new QueryObserver(queryClient, {
      queryKey: ["events", "detail", "e1", "u9"],
      queryFn: () =>
        new Promise((resolve) => {
          staleBack = () => resolve(anEventDetail({ myParticipation: "pending" }))
        }),
    })
    const unsubscribe = detail.subscribe(vi.fn())
    await waitFor(() => expect(detail.getCurrentResult().fetchStatus).toBe("fetching"))

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => staleBack?.())
    // let the stale answer land, if it were going to
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

    expect(
      queryClient.getQueryData<{ myParticipation: string | null }>(["events", "detail", "e1", "u9"])
        ?.myParticipation,
    ).toBeNull()
    unsubscribe()
  })
})
