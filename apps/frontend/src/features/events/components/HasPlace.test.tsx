import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { happeningThanks, HasPlace } from "@/features/events/components/HasPlace"

describe("HasPlace", () => {
  it("says the place is yours, with the full logo and the line under it", () => {
    const { container } = render(<HasPlace line="Změny akce uvidíš tady a v Mých akcích." />)

    expect(screen.getByText("Máš místo. Parta je o jednoho větší.")).toBeInTheDocument()
    expect(screen.getByText("Změny akce uvidíš tady a v Mých akcích.")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("bg-secondary", "border-tile-border")
    expect(container.querySelector("[data-full]")).not.toBeNull()
  })

  // DESIGN.md › Máš místo: the „ty“ dot fills in only under motion-safe
  it("animates the „ty“ dot only when asked, and only under motion-safe", () => {
    const { container, rerender } = render(<HasPlace />)
    const self = () => container.querySelector("[data-slot=logo-self]")!

    expect(self().getAttribute("class")).not.toMatch(/animate/)
    rerender(<HasPlace isFillAnimated />)
    expect(self().getAttribute("class")).toMatch(/motion-safe:animate-in/)
    expect(self().getAttribute("class")).not.toMatch(/(^|\s)animate-in/)
  })
})

describe("happeningThanks", () => {
  it.each([
    [6, 6, "Díky tobě se akce koná – sešlo se 6 lidí, minimum je 6."],
    [3, 3, "Díky tobě se akce koná – sešli se 3 lidé, minimum je 3."],
    [1, 1, "Díky tobě se akce koná."],
  ])("%i of minimum %i: „%s“", (approved, min, text) => {
    expect(happeningThanks(approved, min)).toBe(text)
  })
})
