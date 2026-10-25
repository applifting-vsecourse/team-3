import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CapacityBar } from "./CapacityBar"

const renderBar = (approvedCount: number, min = 8, max = 10) => {
  const { container } = render(
    <CapacityBar
      approvedCount={approvedCount}
      minParticipants={min}
      maxParticipants={max}
    />,
  )
  return {
    fill: container.querySelector<HTMLElement>("[data-slot=capacity-fill]"),
    tick: container.querySelector<HTMLElement>("[data-slot=capacity-tick]"),
  }
}

describe("CapacityBar", () => {
  it("below the minimum: how many are missing, in bold, with the tick at the minimum", () => {
    const { fill, tick } = renderBar(6)

    expect(screen.getByText("Chybí ještě 2")).toHaveClass("font-semibold")
    expect(screen.getByText("6 z 10 · min. 8")).toBeInTheDocument()
    expect(fill).toHaveClass("bg-primary")
    expect(fill?.style.width).toBe("60%")
    expect(tick?.style.left).toBe("80%")
  })

  it("minimum reached: the free places, in regular weight", () => {
    renderBar(8)

    expect(screen.getByText("Volná místa: 2")).not.toHaveClass("font-semibold")
  })

  it("the tick takes the colour of what it sits on, so it shows in dark mode too", () => {
    // below the minimum it sits on the track
    expect(renderBar(6).tick).toHaveClass("bg-foreground")
    // at the minimum the fill ends at the tick: half of it is on the track
    expect(renderBar(8).tick).toHaveClass("bg-foreground")
    // past the minimum it sits inside the lime fill (foreground is near white in dark mode)
    expect(renderBar(9).tick).toHaveClass("bg-primary-foreground")
  })

  it("full: muted, filled to the end, no tick", () => {
    const { fill, tick } = renderBar(10)

    expect(screen.getByText("Plno")).toHaveClass("text-muted-foreground")
    expect(fill).toHaveClass("bg-muted-foreground")
    expect(fill?.style.width).toBe("100%")
    expect(tick).toBeNull()
  })

  it("nobody yet: an empty bar", () => {
    const { fill } = renderBar(0, 3, 6)

    expect(screen.getByText("Chybí ještě 3")).toBeInTheDocument()
    expect(fill?.style.width).toBe("0%")
  })
})
