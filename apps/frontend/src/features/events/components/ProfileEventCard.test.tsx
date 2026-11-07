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
      />,
    )

    expect(screen.getByText("Proběhlo")).toBeInTheDocument()
    expect(screen.getByText("Sešlo se 5 lidí")).toBeInTheDocument()
    expect(document.querySelector("[data-slot=capacity-track]")).toBeNull()
  })
})
