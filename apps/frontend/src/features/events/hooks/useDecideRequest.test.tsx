import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
})
