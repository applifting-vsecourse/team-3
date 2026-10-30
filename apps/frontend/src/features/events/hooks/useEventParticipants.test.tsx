import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { LIVE_REFRESH_MS } from "@/features/events/api/eventsQueryOptions"
import { useEventParticipants } from "@/features/events/hooks/useEventParticipants"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

const lists = (requests: { id: string; name: string; requestedAt: string }[]) =>
  ({ json: () => Promise.resolve({ participants: [], requests }) }) as never

const renderLists = (isOrganizer: boolean) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useEventParticipants("e1", "u1", isOrganizer), { wrapper })
}

describe("useEventParticipants (#43, #53)", () => {
  beforeEach(() => {
    get.mockReset()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => vi.useRealTimers())

  // P-C-1: the organizer's window stays in sight while the request comes from a phone
  it("while the management page is open, a new request shows up by itself", async () => {
    get.mockReturnValue(lists([]))
    const { result } = renderLists(true)
    await waitFor(() => expect(result.current.requests).toEqual([]))

    get.mockReturnValue(
      lists([{ id: "u5", name: "Jakub Král", requestedAt: "2026-10-26T09:00:00Z" }]),
    )
    await vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS)

    await waitFor(() => expect(result.current.requests?.map((r) => r.name)).toEqual(["Jakub Král"]))
  })

  it("someone else than the organizer never asks (the API would answer 403)", async () => {
    renderLists(false)

    await vi.advanceTimersByTimeAsync(3 * LIVE_REFRESH_MS)

    expect(get).not.toHaveBeenCalled()
  })
})
