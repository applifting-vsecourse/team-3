import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  // DESIGN.md › Colour, #298: lime on cream or white is about 1.1:1, so the primary button
  // carries the primary-edge outline (Figma Button/Primary) — it vanished on the page without it
  it("the primary (lime) button carries its primary-edge outline", () => {
    render(<Button>Přihlásit se na akci</Button>)

    expect(screen.getByRole("button")).toHaveClass("border", "border-primary-edge", "bg-primary")
  })
})
