import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useElementHeight } from "./useElementHeight"

function Probe() {
  const [ref, height] = useElementHeight<HTMLDivElement>()
  return (
    <>
      <div ref={ref} />
      <output>{height}</output>
    </>
  )
}

describe("useElementHeight (#288)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("follows the element's height as it changes", () => {
    const callbacks: ResizeObserverCallback[] = []
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback)
        }
        observe = vi.fn()
        disconnect = vi.fn()
      },
    )
    let height = 60
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => height)

    render(<Probe />)
    expect(screen.getByRole("status")).toHaveTextContent("60")

    // the search field opens above the chips
    height = 108
    act(() => callbacks.forEach((callback) => callback([], {} as ResizeObserver)))
    expect(screen.getByRole("status")).toHaveTextContent("108")
  })
})
