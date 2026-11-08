import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { getRememberedLocality } from "@/lib/catalog/rememberedLocality"

import { useLocality } from "./useLocality"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

const brno = { id: "l-brno", slug: "brno", name: "Brno", parentId: null, lat: 49.2, lng: 16.6 }
const answer = (body: unknown) => ({ json: () => Promise.resolve(body) }) as never

const renderLocality = (
  urlSlug: string | undefined,
  // "loading": the session isn't known yet
  userId: { id: string | null } | "loading" = { id: null },
) => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useLocality(urlSlug, userId === "loading" ? undefined : userId.id), {
    wrapper,
  })
}

// Node's own half-made localStorage shadows jsdom's in tests: a plain in-memory one
const memoryStorage = () => {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

describe("useLocality", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage())
    get.mockReset()
    get.mockReturnValue(answer({ locality: brno, source: "ip" }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("starts in the default from the API: the guess from the IP", async () => {
    const { result } = renderLocality(undefined)

    await waitFor(() => expect(result.current.slug).toBe("brno"))
    expect(result.current.source).toBe("ip")
    expect(result.current.isPicked).toBe(false)
    expect(get).toHaveBeenCalledWith("geo/locality")
  })

  it("is all of Czechia when nothing is known", async () => {
    get.mockReturnValue(answer({ locality: null, source: "none" }))
    const { result } = renderLocality(undefined)

    await waitFor(() => expect(result.current.slug).toBe("cele-cesko"))
  })

  it("is all of Czechia when the API fails, never Praha", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("offline")) } as never)
    const { result } = renderLocality(undefined)

    await waitFor(() => expect(result.current.slug).toBe("cele-cesko"))
    expect(result.current.source).toBe("none")
  })

  it("waits for the session, so a home locality can't swap in later", () => {
    const { result } = renderLocality(undefined, "loading")

    expect(result.current.slug).toBeUndefined()
    expect(get).not.toHaveBeenCalled()
  })

  it("takes the URL first, without asking the API", () => {
    const { result } = renderLocality("praha-8")

    expect(result.current).toMatchObject({ slug: "praha-8", source: "url", isPicked: true })
    expect(get).not.toHaveBeenCalled()
  })

  it("remembers a pick in this browser and „Zrušit vše“ forgets it", async () => {
    const { result } = renderLocality(undefined)
    await waitFor(() => expect(result.current.slug).toBe("brno"))

    act(() => result.current.pick("ostrava"))
    expect(result.current).toMatchObject({ slug: "ostrava", source: "remembered", isPicked: true })
    expect(getRememberedLocality()).toBe("ostrava")

    act(() => result.current.forget())
    expect(result.current).toMatchObject({ slug: "brno", source: "ip", isPicked: false })
    expect(getRememberedLocality()).toBeUndefined()
  })

  it("starts in a pick remembered earlier", () => {
    localStorage.setItem("hobbyhub.lokalita", "liberec")
    const { result } = renderLocality(undefined)

    expect(result.current).toMatchObject({ slug: "liberec", source: "remembered" })
  })

  it("ignores a tampered remembered value", async () => {
    localStorage.setItem("hobbyhub.lokalita", "<script>")
    const { result } = renderLocality(undefined)

    await waitFor(() => expect(result.current.slug).toBe("brno"))
  })
})

describe("useLocality without storage (a private window)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    })
    get.mockReset()
    get.mockReturnValue(answer({ locality: brno, source: "ip" }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("still shows the default and survives a pick", async () => {
    const { result } = renderLocality(undefined)
    await waitFor(() => expect(result.current.slug).toBe("brno"))

    act(() => result.current.pick("ostrava"))
    expect(result.current.slug).toBe("brno")
  })
})
