import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  // DESIGN.md › Colour, #298: lime on cream or white is about 1.1:1, so the primary button
  // carries the primary-edge outline (Figma Button/Primary) — it vanished on the page without it
  // PO 26. 11.: dark green on light surfaces, lime on the band — the tokens switch (on-hero)
  it("the primary button takes its colours from the button-primary tokens", () => {
    render(<Button>Přihlásit se na akci</Button>)

    expect(screen.getByRole("button")).toHaveClass(
      "border",
      "border-button-primary-edge",
      "bg-button-primary",
      "text-button-primary-foreground",
    )
  })
})
