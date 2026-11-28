import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { InterestTray } from "./InterestTray"

// review #446: the tray is a dark surface; with `bg-hero text-on-hero` alone the tokens stayed the
// light page's, so „Pokračovat s výběrem“ got a dark green fill and edge on dark green (~1:1)
describe("InterestTray", () => {
  it("is an on-hero surface, so its button takes the band's colours", () => {
    render(
      <InterestTray
        interests={[{ id: "a1", slug: "beh", name: "Běh", keywords: [] }]}
        onRemove={vi.fn()}
        onReview={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: /Pokračovat s výběrem/ })
    expect(button.closest(".on-hero")).not.toBeNull()
  })
})
