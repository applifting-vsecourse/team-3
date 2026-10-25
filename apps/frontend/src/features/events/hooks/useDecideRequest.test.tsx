import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useDecideRequest } from "@/features/events/hooks/useDecideRequest"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn() },
}))

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useDecideRequest("e1", "u1"), { wrapper })
  return { queryClient, invalidate, result }
}

describe("useDecideRequest (#53)", () => {
  it("sends one request's id, puts the answer on the page and refetches the detail and the list", async () => {
    vi.mocked(api.post).mockReturnValue({
      json: () => Promise.resolve({ participants: [{ id: "u5", name: "Jakub" }], requests: [] }),
    } as never)
    const { queryClient, invalidate, result } = setup()

    act(() => result.current.mutate({ userId: "u5", decision: "approve" }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith("events/e1/participants/approve", {
      json: { userIds: ["u5"] },
    })
    expect(queryClient.getQueryData(["events", "participants", "e1", "u1"])).toEqual({
      participants: [{ id: "u5", name: "Jakub" }],
      requests: [],
    })
    // an approval takes a place: the capacity on the detail and in the list changes
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "detail", "e1", "u1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "list"] })
  })

  it("stays pending until the detail is back, so „Schválit“ waits for the new capacity", async () => {
    vi.mocked(api.post).mockReturnValue({
      json: () => Promise.resolve({ participants: [{ id: "u5", name: "Jakub" }], requests: [] }),
    } as never)
    const { queryClient, result } = setup()
    let detailBack: (() => void) | undefined
    // the page's detail query, on screen: its refetch is what the decision waits for
    queryClient.setQueryData(["events", "detail", "e1", "u1"], { isFull: false })
    const detail = new QueryObserver(queryClient, {
      queryKey: ["events", "detail", "e1", "u1"],
      queryFn: () =>
        new Promise((resolve) => {
          detailBack = () => resolve({ isFull: true })
        }),
      staleTime: Infinity,
    })
    const unsubscribe = detail.subscribe(vi.fn())

    act(() => result.current.mutate({ userId: "u5", decision: "approve" }))

    await waitFor(() => expect(detail.getCurrentResult().fetchStatus).toBe("fetching"))
    expect(result.current.isPending).toBe(true)
    act(() => detailBack?.())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(["events", "detail", "e1", "u1"])).toEqual({ isFull: true })
    unsubscribe()
  })

  it("a refusal (full meanwhile, withdrawn) refetches the lists on the page", async () => {
    const conflict = new HTTPError(
      new Response(null, { status: 409 }),
      new Request("http://localhost:4050/api/events/e1/participants/approve"),
      {} as never,
    )
    vi.mocked(api.post).mockReturnValue({ json: () => Promise.reject(conflict) } as never)
    const { invalidate, result } = setup()

    act(() => result.current.mutate({ userId: "u5", decision: "approve" }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "participants", "e1", "u1"] })
  })

  it("the page's poll of the lists, still on its way, doesn't bring the decided request back", async () => {
    vi.mocked(api.post).mockReturnValue({
      json: () => Promise.resolve({ participants: [{ id: "u5", name: "Jakub" }], requests: [] }),
    } as never)
    const { queryClient, result } = setup()
    let staleBack: (() => void) | undefined
    // the management page asks every few seconds (P-C-1); this answer is from before the decision
    const lists = new QueryObserver(queryClient, {
      queryKey: ["events", "participants", "e1", "u1"],
      queryFn: () =>
        new Promise((resolve) => {
          staleBack = () => resolve({ participants: [], requests: [{ id: "u5", name: "Jakub" }] })
        }),
    })
    const unsubscribe = lists.subscribe(vi.fn())
    await waitFor(() => expect(lists.getCurrentResult().fetchStatus).toBe("fetching"))

    act(() => result.current.mutate({ userId: "u5", decision: "approve" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => staleBack?.())
    // let the stale answer land, if it were going to
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))

    expect(queryClient.getQueryData(["events", "participants", "e1", "u1"])).toEqual({
      participants: [{ id: "u5", name: "Jakub" }],
      requests: [],
    })
    unsubscribe()
  })
})
