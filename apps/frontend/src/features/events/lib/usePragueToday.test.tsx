import { act, fireEvent, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { usePragueToday } from "@/features/events/lib/usePragueToday"

afterEach(() => vi.useRealTimers())

describe("usePragueToday", () => {
  it("updates at Prague midnight, including a daylight-saving transition", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-28T22:59:59.500Z"))
    const { result, unmount } = renderHook(() => usePragueToday())
    expect(result.current).toBe("2026-03-28")

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe("2026-03-29")
    act(() => {
      vi.advanceTimersByTime(23 * 60 * 60 * 1000)
    })
    expect(result.current).toBe("2026-03-30")
    unmount()
  })

  it("refreshes after the device wakes and the window regains focus", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-24T12:00:00Z"))
    const { result, unmount } = renderHook(() => usePragueToday())
    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"))
    act(() => {
      fireEvent.focus(window)
    })
    expect(result.current).toBe("2026-10-26")
    unmount()
  })
})
