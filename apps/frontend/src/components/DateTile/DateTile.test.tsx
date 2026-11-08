import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DateTile } from "./DateTile"

describe("DateTile", () => {
  it("shows the weekday, the day and the time on secondary with its edge", () => {
    const { container } = render(
      <DateTile
        weekday="Pá"
        day="23"
        time="18:30"
      />,
    )

    expect(container.textContent).toBe("Pá2318:30")
    expect(container.firstElementChild).toHaveClass("bg-secondary", "border-tile-border")
    expect(screen.getByText("23")).toHaveClass("type-date-m")
  })

  it("small, without the time, and neutral for a past event", () => {
    const { container } = render(
      <DateTile
        weekday="Po"
        day="19"
        size="s"
        isPast
      />,
    )

    expect(container.textContent).toBe("Po19")
    expect(container.firstElementChild).toHaveClass("bg-muted", "text-muted-foreground")
    expect(screen.getByText("19")).toHaveClass("type-date-s")
  })
})
