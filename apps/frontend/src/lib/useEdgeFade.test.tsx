import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { edgeFadeClass, useEdgeFade } from "@/lib/useEdgeFade"

function Strip({ scrollWidth }: { scrollWidth: number }) {
  const [ref, fade] = useEdgeFade<HTMLDivElement>()
  return (
    <div
      data-testid="strip"
      data-fade={fade ?? "none"}
      ref={(node) => {
        if (node) {
          // jsdom lays nothing out: the strip is 300 px wide, its chips `scrollWidth`
          Object.defineProperty(node, "clientWidth", { configurable: true, value: 300 })
          Object.defineProperty(node, "scrollWidth", { configurable: true, value: scrollWidth })
        }
        return ref(node)
      }}
    />
  )
}

const scrollTo = (left: number) => {
  const strip = screen.getByTestId("strip")
  act(() => {
    strip.scrollLeft = left
    strip.dispatchEvent(new Event("scroll"))
  })
}

// QA-18: the chips and the tabs scroll sideways on a phone without a scrollbar
describe("useEdgeFade", () => {
  it("everything fits: no edge fades", () => {
    render(<Strip scrollWidth={300} />)
    expect(screen.getByTestId("strip")).toHaveAttribute("data-fade", "none")
  })

  it("more behind the right edge: that one fades, then both, then only the left", () => {
    render(<Strip scrollWidth={600} />)
    expect(screen.getByTestId("strip")).toHaveAttribute("data-fade", "end")

    scrollTo(150)
    expect(screen.getByTestId("strip")).toHaveAttribute("data-fade", "both")

    scrollTo(300)
    expect(screen.getByTestId("strip")).toHaveAttribute("data-fade", "start")
  })

  it("each fade masks its own edge", () => {
    expect(edgeFadeClass.end).toContain("to_left")
    expect(edgeFadeClass.start).toContain("to_right")
  })
})
