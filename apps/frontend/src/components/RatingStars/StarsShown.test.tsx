import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StarsShown } from "./StarsShown"

describe("StarsShown", () => {
  it("draws five stars, the given ones full, read out as one image", () => {
    const { container } = render(<StarsShown stars={4} />)

    expect(screen.getByRole("img", { name: "4 z 5 hvězd" })).toBeInTheDocument()
    const stars = container.querySelectorAll("svg")
    expect(stars).toHaveLength(5)
    expect([...stars].filter((star) => star.classList.contains("fill-foreground"))).toHaveLength(4)
    expect(stars[4]).toHaveClass("fill-none", "text-control-border")
  })
})
