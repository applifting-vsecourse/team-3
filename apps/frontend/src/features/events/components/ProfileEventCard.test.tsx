import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { ProfileEventCard } from "@/features/events/components/ProfileEventCard"
import { aMyEvent } from "@/features/events/test/anEvent"

describe("ProfileEventCard (#178, Figma B-05)", () => {
  it("Kam jdu: a waiting request says so and the card opens the detail", async () => {
    await renderWithRouter(
      <ProfileEventCard
        event={aMyEvent({ id: "e1", title: "Výlet na Zbraslav", myParticipation: "pending" })}
        section="upcoming"
        viewerId="u-jakub"
      />,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Výlet na Zbraslav" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Výlet na Zbraslav" })).toHaveAttribute(
      "href",
      "/akce/e1",
    )
    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
    expect(document.querySelector("[data-slot=capacity-track]")).not.toBeNull()
  })

  it("Kam jdu: „Jdu“, and the line starts with how many are missing", async () => {
    await renderWithRouter(
      <ProfileEventCard
        event={aMyEvent({ approvedCount: 3, missingToMin: 1, freeSpots: 9 })}
        section="upcoming"
        viewerId="u-jakub"
      />,
    )

    expect(screen.getByText("Jdu")).toBeInTheDocument()
    expect(screen.getByText(/^chybí 1 · 17:30 · Kavárna Pražírna · Praha 8$/)).toBeInTheDocument()
  })

  it("Pořádám: the occupancy, or „Zrušeno“, and still the detail", async () => {
    await renderWithRouter(
      <ProfileEventCard
        event={aMyEvent({ id: "e3", status: "cancelled", myParticipation: null })}
        section="organizing"
        viewerId="u-jakub"
      />,
    )

    expect(screen.getByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveAttribute("href", "/akce/e3")
  })

  it("Proběhlé: the past card with how many came", async () => {
    await renderWithRouter(
      <ProfileEventCard
        event={aMyEvent({ approvedCount: 5 })}
        section="past"
        viewerId="u-jakub"
      />,
    )

    expect(screen.getByText("Proběhlo")).toBeInTheDocument()
    expect(screen.getByText("Sešlo se 5 lidí")).toBeInTheDocument()
    expect(document.querySelector("[data-slot=capacity-track]")).toBeNull()
  })

  // the fixture starts Fri 23. 10. 17:30 in Prague without an end: it ended with that day,
  // so it can be rated until Fri 6. 11., 23:59:59.999
  it("Proběhlé: „Ohodnotit →“ leads to the rating page while it can be rated (#66, review #315)", async () => {
    await renderWithRouter(
      <ProfileEventCard
        event={aMyEvent({ id: "e7", approvedCount: 5 })}
        section="past"
        viewerId="u-jakub"
        now={new Date("2026-10-24T10:00:00.000Z")}
      />,
    )

    expect(screen.getByRole("link", { name: "Ohodnotit →" })).toHaveAttribute(
      "href",
      "/akce/e7/hodnoceni",
    )
  })

  it.each([
    ["after the window", { approvedCount: 5 }, "u-jakub", "2026-11-06T23:00:00.000Z"],
    [
      "below its minimum: it didn't take place",
      { approvedCount: 3 },
      "u-jakub",
      "2026-10-24T10:00:00.000Z",
    ],
    ["the organizer's own event", { approvedCount: 5 }, "u1", "2026-10-24T10:00:00.000Z"],
    [
      "a cancelled event",
      { approvedCount: 5, status: "cancelled" as const },
      "u-jakub",
      "2026-10-24T10:00:00.000Z",
    ],
  ])("Proběhlé: no „Ohodnotit →“ %s", async (_case, event, viewerId, now) => {
    await renderWithRouter(
      <ProfileEventCard
        event={aMyEvent(event)}
        section="past"
        viewerId={viewerId}
        now={new Date(now)}
      />,
    )

    expect(screen.queryByRole("link", { name: "Ohodnotit →" })).not.toBeInTheDocument()
  })
})
