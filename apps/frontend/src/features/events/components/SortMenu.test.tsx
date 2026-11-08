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

  it("is a plain label without a centre to measure from", () => {
    render(
      <SortMenu
        value="termin"
        isDistanceAvailable={false}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Řadit: nejbližší termín")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
