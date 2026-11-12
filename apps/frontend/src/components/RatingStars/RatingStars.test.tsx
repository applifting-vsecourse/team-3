import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RatingStars } from "./RatingStars"

function Labelled({ initial = null }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <>
      <p id="question">Jak se akce povedla?</p>
      <RatingStars
        value={value}
        onChange={setValue}
        aria-labelledby="question"
      />
    </>
  )
}

describe("RatingStars (Figma Hodnocení/Hvězdičky)", () => {
  it("is a radio group named by its question, each star „N z 5 hvězd“", () => {
    render(<Labelled />)

    expect(screen.getByRole("radiogroup", { name: "Jak se akce povedla?" })).toBeInTheDocument()
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "1 z 5 hvězd",
      "2 z 5 hvězd",
      "3 z 5 hvězd",
      "4 z 5 hvězd",
      "5 z 5 hvězd",
    ])
    // nothing picked yet (Hodnota=0)
    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked()
  })

  it("a click picks the stars and fills them up to it, the rest outlined", async () => {
    const user = userEvent.setup()
    render(<Labelled />)

    await user.click(screen.getByRole("radio", { name: "3 z 5 hvězd" }))

    expect(screen.getByRole("radio", { name: "3 z 5 hvězd" })).toBeChecked()
    const icons = screen.getAllByRole("radio").map((radio) => radio.querySelector("svg"))
    expect(icons.slice(0, 3).every((icon) => icon?.classList.contains("fill-foreground"))).toBe(
      true,
    )
    // never lime: lime fails 3:1 (DESIGN.md › Rating stars)
    expect(icons.slice(3).every((icon) => icon?.classList.contains("text-control-border"))).toBe(
      true,
    )
  })

  it("arrows move between the stars and Space picks one, as in any radio group", async () => {
    const user = userEvent.setup()
    render(<Labelled initial={2} />)

    await user.click(screen.getByRole("radio", { name: "2 z 5 hvězd" }))
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "3 z 5 hvězd" })).toHaveFocus()

    await user.keyboard(" ")
    expect(screen.getByRole("radio", { name: "3 z 5 hvězd" })).toBeChecked()
  })

  it("every star is a 40 px target", () => {
    render(<Labelled />)

    for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveClass("size-10")
  })

  it("tells the form the number", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RatingStars
        value={null}
        onChange={onChange}
        aria-labelledby="x"
      />,
    )

    await user.click(screen.getByRole("radio", { name: "5 z 5 hvězd" }))

    expect(onChange).toHaveBeenCalledWith(5)
  })
})
