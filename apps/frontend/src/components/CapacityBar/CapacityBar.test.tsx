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
    expect(fill).not.toHaveClass("bg-primary")
    expect(fill?.style.width).toBe("60%")
    expect(tick?.style.left).toBe("80%")
    expect(label).toHaveTextContent("min. 8")
    expect(label?.style.left).toBe("80%")
    expect(label).toHaveClass("-translate-x-1/2")
  })

  it("exactly at the minimum: the event happens, so the fill turns solid lime", () => {
    const { fill, tick, label } = renderBar(8)

    expect(screen.getByText("Volná místa: 2")).not.toHaveClass("font-semibold")
    expect(fill).toHaveClass("bg-primary")
    expect(fill).not.toHaveClass("capacity-hatch")
    expect(fill?.style.width).toBe("80%")
    expect(tick).not.toBeNull()
    expect(label).toHaveTextContent("min. 8")
  })

  it("past the minimum: solid lime, and the marker keeps one style with a gap around it", () => {
    const { fill, tick } = renderBar(9)

    expect(fill).toHaveClass("bg-primary")
    expect(fill).not.toHaveClass("capacity-hatch")
    // 16px tall over the 8px track, drawn above the fill, the background-coloured ring as a gap
    expect(tick).toHaveClass("h-4", "-top-1", "w-0.5", "bg-foreground", "ring-2", "ring-background")
    expect(tick).not.toHaveClass("bg-primary-foreground")
    expect(fill?.compareDocumentPosition(tick!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("full: muted, filled to the end, no marker and no label", () => {
    const { fill, tick, label } = renderBar(10)

    expect(screen.getByText("Plno")).toHaveClass("text-muted-foreground")
    expect(screen.getByText("10 z 10")).toBeInTheDocument()
    expect(fill).toHaveClass("bg-muted-foreground")
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
    // reaching the minimum fills it: straight to Plno, never solid lime
    expect(renderBar(10, 10, 10).fill).toHaveClass("bg-muted-foreground")
  })

  it("no minimum: nothing is missing, so the fill is solid from the start", () => {
    const { fill, label } = renderBar(0, 0, 10)

    expect(screen.getByText("Volná místa: 10")).toBeInTheDocument()
    expect(fill).toHaveClass("bg-primary")
    expect(fill).not.toHaveClass("capacity-hatch")
    expect(label).toHaveClass("translate-x-0")
  })

  it("reads in order: the status, the count, then the minimum", () => {
    const { container } = render(
      <CapacityBar
        approvedCount={6}
        minParticipants={8}
        maxParticipants={10}
      />,
    )

    expect(container.textContent).toBe("Chybí ještě 26 z 10min. 8")
    expect(container.querySelector("[data-slot=capacity-track]")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })
})
