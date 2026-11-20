import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useHideEvent, useUnhideEvent } from "@/features/events/hooks/useModerateEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn() },
}))

const setup = <T,>(useHook: () => T) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  return { result, invalidate }
}

describe("useHideEvent / useUnhideEvent (#308)", () => {
  beforeEach(() => {
    vi.mocked(api.post)
      .mockReset()
      .mockResolvedValue(new Response(null, { status: 204 }) as never)
  })

  it("deactivates with the reason, then reads the detail and every list again", async () => {
    const { result, invalidate } = setup(() => useHideEvent("e 1", "admin"))

    act(() => result.current.mutate("Podvod"))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith("admin/events/e%201/hide", {
      json: { reason: "Podvod" },
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "detail", "e 1", "admin"] })
    // /akce, the map, the landing page, Moje akce and a group's events are all under it
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "list"] })
  })

  it("restores, and refreshes the same", async () => {
    const { result, invalidate } = setup(() => useUnhideEvent("e1", "admin"))

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith("admin/events/e1/unhide")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "list"] })
  })

  it("a refusal refreshes the detail too: it is out of date", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Zrušenou akci deaktivovat nejde."))
    const { result, invalidate } = setup(() => useHideEvent("e1", "admin"))

    act(() => result.current.mutate("Podvod"))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events", "detail", "e1", "admin"] })
  })
})
