import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"

import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { anEventDetail } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

// like ky: the request promise rejects when the body is read
const failing = (error: Error) => ({ json: () => Promise.reject(error) }) as never

const httpError = (status: number) =>
  new HTTPError(
    new Response(null, { status }),
    new Request("http://localhost:4050/api/events/e1"),
    {} as never,
  )

const renderDetail = (viewerId: string | null | undefined) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(() => useEventDetail("e1", viewerId), { wrapper }) }
}

describe("useEventDetail", () => {
  beforeEach(() => get.mockReset())

  it("waits for the session before fetching, so it doesn't fetch the wrong variant", () => {
    const { result } = renderDetail(undefined)

    expect(result.current.isPending).toBe(true)
    expect(get).not.toHaveBeenCalled()
  })

  it("fetches and parses the event once the session is known", async () => {
    get.mockReturnValue(asJson(anEventDetail({ participants: null })))
    const { result } = renderDetail(null)

    await waitFor(() => expect(result.current.event).toBeDefined())
    expect(get).toHaveBeenCalledWith("events/e1")
    expect(result.current.event?.startsAt).toBeInstanceOf(Date)
    expect(result.current.event?.participants).toBeNull()
  })

  it("a 404 is „not found“, not an error to retry", async () => {
    get.mockReturnValue(failing(httpError(404)))
    const { result } = renderDetail(null)

    await waitFor(() => expect(result.current.isNotFound).toBe(true))
    expect(result.current.error).toBeUndefined()
  })

  it("any other failure is an error with a retry", async () => {
    get.mockReturnValue(failing(httpError(500)))
    const { result } = renderDetail(null)

    await waitFor(() => expect(result.current.error).toBeInstanceOf(HTTPError))
    expect(result.current.isNotFound).toBe(false)
  })

  it("caches the visitor and the signed-in variant apart", async () => {
    get.mockReturnValue(asJson(anEventDetail()))
    const { queryClient, result } = renderDetail("u9")

    await waitFor(() => expect(result.current.event).toBeDefined())
    expect(queryClient.getQueryData(["events", "detail", "e1", "u9"])).toBeDefined()
    expect(queryClient.getQueryData(["events", "detail", "e1", null])).toBeUndefined()
  })
})
