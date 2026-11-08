import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HappeningStamp } from "./HappeningStamp"

describe("HappeningStamp", () => {
  it("says „Koná se“ in lime with its edge, tilted like a stamp", () => {
    render(<HappeningStamp />)

    expect(screen.getByText("Koná se")).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
      "border-primary-edge",
      "type-stamp",
      "-rotate-6",
    )
  })
})
