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

  it("below its minimum: „Nekonalo se“, why, and nothing to rate (#61)", async () => {
    await renderWithRouter(
      <PastEventCard
        event={{ ...volleyball(), approvedCount: 2, missingToMin: 2 }}
        rating={{ kind: "open" }}
        rateAction={<a href="/akce/e1/hodnoceni">Ohodnotit →</a>}
      />,
    )

    expect(screen.getByText("Nekonalo se")).toBeInTheDocument()
    expect(screen.getByText("Do minima chyběli 2 lidé")).toBeInTheDocument()
    expect(screen.queryByText("Proběhlo")).not.toBeInTheDocument()
    expect(screen.queryByText("Ohodnotit →")).not.toBeInTheDocument()
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

  it("opens the event's detail; without it where the detail isn't for everyone (review #315)", async () => {
    const { unmount } = await renderWithRouter(<PastEventCard event={volleyball()} />)
    expect(screen.getByRole("link", { name: volleyball().title })).toHaveAttribute(
      "href",
      `/akce/${volleyball().id}`,
    )
    unmount()

    await renderWithRouter(
      <PastEventCard
        event={volleyball()}
        isLinked={false}
      />,
    )
    expect(screen.getByRole("heading", { name: volleyball().title })).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("cancelled: „Zrušeno“ and that it didn't take place, from the event's status", async () => {
    await renderWithRouter(
      <PastEventCard
        event={{ ...volleyball(), status: "cancelled" }}
        // whatever the rating says, a cancelled event has nothing to rate
        rating={{ kind: "open" }}
        rateAction={<a href="/hodnoceni">Ohodnotit →</a>}
      />,
    )

    expect(screen.getByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getByText("Akce se nekonala")).toBeInTheDocument()
    expect(screen.queryByText(/Sešlo se/)).not.toBeInTheDocument()
    expect(screen.queryByText("Proběhlo")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ohodnotit →" })).not.toBeInTheDocument()
  })

  it("adds the page's detail after how many came, e.g. the event's rating (#179)", async () => {
    await renderWithRouter(
      <PastEventCard
        event={volleyball()}
        rating={{ kind: "open" }}
        detail="★ 4,5 (3 hodnocení)"
      />,
    )

    expect(screen.getByText("Sešlo se 5 lidí · ★ 4,5 (3 hodnocení)")).toBeInTheDocument()
  })
})
