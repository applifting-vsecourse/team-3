import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { anOccupancy } from "@/test/anOccupancy"

import { CapacityBar } from "./CapacityBar"

const renderBar = (
  approvedCount: number,
  min = 8,
  max = 10,
  variant: "detail" | "compact" = "detail",
) => {
  const { container } = render(
    <CapacityBar
      {...anOccupancy(approvedCount, min, max)}
      variant={variant}
    />,
  )
  return {
    track: container.querySelector<HTMLElement>("[data-slot=capacity-track]"),
    fill: container.querySelector<HTMLElement>("[data-slot=capacity-fill]"),
    tick: container.querySelector<HTMLElement>("[data-slot=capacity-tick]"),
    label: container.querySelector<HTMLElement>("[data-slot=capacity-min]"),
  }
}

describe("CapacityBar", () => {
  it("below the minimum: how many are missing, in bold, the fill hatched, the minimum marked and labelled", () => {
    const { fill, tick, label } = renderBar(6)

    expect(screen.getByText("Chybí ještě 2")).toHaveClass("font-semibold")
    // the minimum is said once, at its marker, not again next to the count
    expect(screen.getByText("6 z 10")).toBeInTheDocument()
    expect(fill).toHaveClass("capacity-hatch")
    expect(fill).not.toHaveClass("bg-capacity-fill")
    expect(fill?.style.width).toBe("60%")
    expect(tick?.style.left).toBe("80%")
    expect(label).toHaveTextContent("min. 8")
    expect(label?.style.left).toBe("80%")
    expect(label).toHaveClass("-translate-x-1/2")
  })

  // Figma Capacity bar: the 8 px track with its 1 px control-border outline outside, the
  // minimum in a dark pill under the marker
  it("draws the track with its outline and the minimum as a pill", () => {
    const { track, label } = renderBar(6)

    expect(track).toHaveClass("h-2", "bg-capacity-track", "ring-1", "ring-control-border")
    expect(label).toHaveClass("rounded-full", "bg-foreground", "text-background")
  })

  it("compact (cards): the 6 px track and a 2 × 14 px marker, no texts", () => {
    const { track, tick, label } = renderBar(6, 8, 10, "compact")

    expect(track).toHaveClass("h-1.5", "ring-1", "ring-control-border")
    expect(tick).toHaveClass("h-3.5", "w-0.5", "ring-card")
    expect(tick?.style.left).toBe("80%")
    expect(label).toBeNull()
    expect(screen.queryByText(/Chybí|z 10|min\./)).not.toBeInTheDocument()
  })

  it("compact and full: filled to the end, no marker", () => {
    const { fill, tick } = renderBar(10, 8, 10, "compact")

    expect(fill).toHaveClass("bg-full")
    expect(tick).toBeNull()
  })

  it("exactly at the minimum: the event happens, so the fill turns solid (capacity-fill)", () => {
    const { fill, tick, label } = renderBar(8)

    expect(screen.getByText("2 volná místa")).not.toHaveClass("font-semibold")
    expect(fill).toHaveClass("bg-capacity-fill")
    expect(fill).not.toHaveClass("capacity-hatch")
    expect(fill?.style.width).toBe("80%")
    expect(tick).not.toBeNull()
    expect(label).toHaveTextContent("min. 8")
  })

  it("past the minimum: solid, and the marker keeps one style with a gap around it", () => {
    const { fill, tick } = renderBar(9)

    expect(fill).toHaveClass("bg-capacity-fill")
    expect(fill).not.toHaveClass("capacity-hatch")
    // Figma Tick: 3 × 22 px from 4 px above the 8 px track down to the pill, drawn above the
    // fill, the card-coloured ring as a gap
    expect(tick).toHaveClass("h-5.5", "-top-1", "w-0.75", "bg-foreground", "ring-2", "ring-card")
    expect(tick).not.toHaveClass("bg-primary-foreground")
    expect(fill?.compareDocumentPosition(tick!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("full: muted, filled to the end, no marker and no label", () => {
    const { fill, tick, label } = renderBar(10)

    expect(screen.getByText("Plno")).toHaveClass("text-muted-foreground")
    expect(screen.getByText("10 z 10")).toBeInTheDocument()
    expect(fill).toHaveClass("bg-full")
    expect(fill).not.toHaveClass("capacity-hatch")
    expect(fill?.style.width).toBe("100%")
    expect(tick).toBeNull()
    expect(label).toBeNull()
    expect(screen.queryByText(/min\./)).not.toBeInTheDocument()
  })

  it("nobody yet: an empty hatched bar, the minimum still marked", () => {
    const { fill, label } = renderBar(0, 3, 6)

    expect(screen.getByText("Chybí ještě 3")).toBeInTheDocument()
    expect(fill?.style.width).toBe("0%")
    expect(fill).toHaveClass("capacity-hatch")
    expect(label).toHaveTextContent("min. 3")
  })

  it("near an end the label aligns to the marker, so it stays over the bar", () => {
    // 1 of 20 is 5 %: the label starts at the marker
    const low = renderBar(0, 1, 20).label
    expect(low?.style.left).toBe("5%")
    expect(low).toHaveClass("translate-x-0")
    expect(low).not.toHaveClass("-translate-x-1/2")
  })

  it("minimum equal to the maximum: marker at the end, hatched until it is full", () => {
    const { fill, tick, label } = renderBar(9, 10, 10)

    expect(screen.getByText("Chybí ještě 1")).toBeInTheDocument()
    expect(fill).toHaveClass("capacity-hatch")
    expect(tick?.style.left).toBe("100%")
    // the label ends at the marker
    expect(label).toHaveClass("-translate-x-full")
    // reaching the minimum fills it: straight to Plno, never the solid fill
    expect(renderBar(10, 10, 10).fill).toHaveClass("bg-full")
  })

  it("one place left: the singular, „1 volné místo“, not „1 volná místa“ (#189)", () => {
    renderBar(9)

    expect(screen.getByText("1 volné místo")).toBeInTheDocument()
    expect(screen.getByText("9 z 10")).toBeInTheDocument()
  })

  it("no minimum: nothing is missing, so the fill is solid from the start", () => {
    const { fill, label } = renderBar(0, 0, 10)

    expect(screen.getByText("10 volných míst")).toBeInTheDocument()
    expect(fill).toHaveClass("bg-capacity-fill")
    expect(fill).not.toHaveClass("capacity-hatch")
    expect(label).toHaveClass("translate-x-0")
  })

  it("reads in order: the status, the count, then the minimum", () => {
    const { container } = render(<CapacityBar {...anOccupancy(6, 8, 10)} />)

    expect(container.textContent).toBe("Chybí ještě 26 z 10min. 8")
    expect(container.querySelector("[data-slot=capacity-track]")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })
})
