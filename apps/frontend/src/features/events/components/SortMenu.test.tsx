import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SortMenu } from "@/features/events/components/SortMenu"

describe("SortMenu (#57)", () => {
  it("offers the distance order and hands the pick over", async () => {
    const onChange = vi.fn()
    render(
      <SortMenu
        value="termin"
        isDistanceAvailable
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /^Řadit:/ }))
    expect(screen.getByRole("menuitemradio", { name: "Nejbližší termín" })).toBeChecked()
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Nejmenší vzdálenost/ }))
    expect(onChange).toHaveBeenCalledWith("vzdalenost")
  })

  it("without a centre it is still a menu: the distance order is off and says why", async () => {
    const onChange = vi.fn()
    render(
      <SortMenu
        value="termin"
        isDistanceAvailable={false}
        onChange={onChange}
      />,
    )

    // a plain label looked like this button and a tap did nothing (Celé Česko)
    await userEvent.click(screen.getByRole("button", { name: /^Řadit:/ }))
    const distance = screen.getByRole("menuitemradio", { name: /Nejmenší vzdálenost/ })
    expect(distance).toHaveAttribute("aria-disabled", "true")
    // the why belongs to the item: a screen reader hears it there
    expect(distance).toHaveAccessibleDescription("Pro řazení podle vzdálenosti vyber lokalitu.")
    await userEvent.click(distance)
    expect(onChange).not.toHaveBeenCalled()
    // still reachable with the arrow keys, not skipped like the kit's `disabled` item
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(distance).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole("menu")).toBeInTheDocument()
  })

  it("a phone shows just the value, so the row above the list fits one line (#324)", () => {
    render(
      <SortMenu
        value="vzdalenost"
        isDistanceAvailable
        onChange={vi.fn()}
      />,
    )

    // CSS isn't applied here: which one shows where is in the classes
    expect(screen.getByText("Řadit:")).toHaveClass("max-md:sr-only")
    expect(screen.getByText("Vzdálenost")).toHaveClass("md:hidden")
    expect(screen.getByText("nejmenší vzdálenost")).toHaveClass("max-md:hidden")
  })

  it("on Proběhlé by date is the newest first, a menu even without a locality (#61, #324)", async () => {
    render(
      <SortMenu
        value="termin"
        isDistanceAvailable={false}
        onChange={vi.fn()}
        isPast
      />,
    )

    expect(screen.getByText("Nejnovější")).toHaveClass("md:hidden")
    expect(screen.getByText("nejnovější")).toHaveClass("max-md:hidden")
    await userEvent.click(screen.getByRole("button", { name: /^Řadit:/ }))
    expect(screen.getByRole("menuitemradio", { name: "Nejnovější" })).toBeChecked()
  })
})
