import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { reverseAddress, type AddressSuggestion } from "@/features/events/api/addressSearch"
import { useEventLocation } from "@/features/events/hooks/useEventLocation"

vi.mock("@/features/events/api/addressSearch", async (original) => ({
  ...(await original<object>()),
  reverseAddress: vi.fn(),
}))
const first = { lat: 50.08, lng: 14.44 }
const second = { lat: 50.09, lng: 14.45 }
const suggestion = (address: string, point = first): AddressSuggestion => ({
  address,
  title: address,
  area: "",
  city: "Praha",
  ...point,
})
const setup = (address = "") => {
  const values = { address, place: null as typeof first | null, localityId: "praha" }
  const hook = renderHook(() =>
    useEventLocation({
      localities: [{ id: "praha", name: "Praha", slug: "praha", parentId: null, ...first }],
      initialAddress: address,
      getValues: () => values,
      setAddress: (value) => {
        values.address = value
      },
      setPlace: (value) => {
        values.place = value
      },
      setLocality: (value) => {
        values.localityId = value
      },
    }),
  )
  return { ...hook, values }
}
beforeEach(() => vi.resetAllMocks())

describe("useEventLocation", () => {
  it("updates its own automatic address on the next map pick", async () => {
    vi.mocked(reverseAddress)
      .mockResolvedValueOnce(suggestion("První"))
      .mockResolvedValueOnce(suggestion("Druhá", second))
    const { result, values } = setup()
    await act(() => result.current.pickPoint(first))
    expect(values.address).toBe("První")
    await act(() => result.current.pickPoint(second))
    expect(values.address).toBe("Druhá")
    expect(values.place).toEqual(second)
    expect(result.current.pendingAddress).toBeNull()
  })

  it("discards the proposal for an older pin when a new point is picked", async () => {
    vi.mocked(reverseAddress)
      .mockResolvedValueOnce(suggestion("První"))
      .mockResolvedValueOnce(suggestion("Druhá", second))
    const { result, values } = setup("Moje místo")
    await act(() => result.current.pickPoint(first))
    expect(result.current.pendingAddress).toBe("První")
    await act(() => result.current.pickPoint(second))
    act(() => result.current.acceptAddress())
    expect(values.address).toBe("Druhá")
    expect(values.place).toEqual(second)
  })

  it("ignores an older reverse response arriving after the newer one", async () => {
    let resolveOld!: (value: AddressSuggestion) => void
    vi.mocked(reverseAddress)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValueOnce(suggestion("Nová", second))
    const { result, values } = setup()
    let old!: Promise<void>
    act(() => {
      old = result.current.pickPoint(first)
    })
    await act(() => result.current.pickPoint(second))
    await act(async () => {
      resolveOld(suggestion("Stará"))
      await old
    })
    expect(values.address).toBe("Nová")
    expect(values.place).toEqual(second)
  })

  it("does not erase locality for a point beyond the catalog", async () => {
    vi.mocked(reverseAddress).mockResolvedValue(undefined)
    const { result, values } = setup()
    await act(() => result.current.pickPoint({ lat: 49, lng: 17 }))
    expect(values.localityId).toBe("praha")
    expect(values.address).toBe("")
    expect(result.current.notice).toContain("Vyber ji ručně")
  })
})
