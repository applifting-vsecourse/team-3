import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Calendar } from "@/components/ui/calendar"

const month = new Date(2026, 9, 1)

describe("Calendar", () => {
  it("shows a disabled day in muted-foreground at half opacity and won't select it", async () => {
    const onSelect = vi.fn()
    const { container } = render(
      <Calendar
        mode="single"
        month={month}
        disabled={{ before: new Date(2026, 9, 10) }}
        onSelect={onSelect}
      />,
    )
    const cell = container.querySelector<HTMLElement>('[data-day="2026-10-05"]')!
    const day = cell.querySelector("button")!

    expect(cell).toHaveClass("text-muted-foreground")
    expect(cell).not.toHaveClass("text-border")
    expect(day).toBeDisabled()
    expect(day).toHaveClass("disabled:opacity-50", "aria-disabled:opacity-50")

    await userEvent.click(day)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("greys out the month arrow it can't go to with muted-foreground", () => {
    render(
      <Calendar
        mode="single"
        month={month}
        startMonth={month}
      />,
    )
    const previous = screen.getByRole("button", { name: /previous/i })

    expect(previous).toHaveAttribute("aria-disabled", "true")
    expect(previous).toHaveClass("aria-disabled:text-muted-foreground", "aria-disabled:opacity-50")
  })
})
