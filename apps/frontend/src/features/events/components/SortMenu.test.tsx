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

    await userEvent.click(screen.getByRole("button", { name: /Řadit: nejbližší termín/ }))
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
    await userEvent.click(screen.getByRole("button", { name: /Řadit: nejbližší termín/ }))
    const distance = screen.getByRole("menuitemradio", { name: /Nejmenší vzdálenost/ })
    expect(distance).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText("Pro řazení podle vzdálenosti vyber lokalitu.")).toBeInTheDocument()
    await userEvent.click(distance)
    expect(onChange).not.toHaveBeenCalled()
  })
})
