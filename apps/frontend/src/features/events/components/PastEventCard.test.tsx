import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PastEventCard } from "@/features/events/components/PastEventCard"
import { anEvent } from "@/features/events/test/anEvent"

const volleyball = () => {
  const event = anEvent({ approvedCount: 5 })
  return {
    ...event,
    activity: {
      id: "a-volejbal",
      slug: "volejbal",
      name: "Volejbal",
      category: event.activity.category,
    },
  }
}

// Figma Karta akce/Proběhlá řádek
describe("PastEventCard", () => {
  it("given: „Proběhlo“, how many came and the user's stars; photo desaturated, tile neutral", async () => {
    const { container } = await renderWithRouter(
      <PastEventCard
        event={volleyball()}
        rating={{ kind: "given", stars: 5 }}
      />,
    )

    expect(screen.getByText("Proběhlo")).toBeInTheDocument()
    expect(screen.getByText("Sešlo se 5 lidí · tvoje ★ 5")).toBeInTheDocument()
    expect(screen.getByText("Pá 23. 10. · Kavárna Pražírna · Praha 8")).toBeInTheDocument()
    expect(container.querySelector("img")).toHaveClass("saturate-40")
    expect(screen.getByText("23").parentElement).toHaveClass("bg-muted")
    expect(container.querySelector("[data-slot=capacity-track]")).toBeNull()
  })

  it("open: the page's „Ohodnotit →“ link", async () => {
    await renderWithRouter(
      <PastEventCard
        event={volleyball()}
        rating={{ kind: "open" }}
        rateAction={<a href="/hodnoceni">Ohodnotit →</a>}
      />,
    )

    expect(screen.getByText("Sešlo se 5 lidí")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ohodnotit →" })).toBeInTheDocument()
  })

  it("cancelled: „Zrušeno“ and that it didn't take place", async () => {
    await renderWithRouter(
      <PastEventCard
        event={volleyball()}
        rating={{ kind: "cancelled" }}
      />,
    )

    expect(screen.getByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getByText("Akce se nekonala")).toBeInTheDocument()
    expect(screen.queryByText(/Sešlo se/)).not.toBeInTheDocument()
  })
})
