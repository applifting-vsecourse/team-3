import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventCard } from "@/features/events/components/EventCard"
import { anEvent } from "@/features/events/test/anEvent"

const florbal = { id: "a-florbal", slug: "florbal", name: "Florbal" }
const fishing = { id: "a-rybareni", slug: "rybareni", name: "Rybaření" }
const withActivity = (activity: typeof florbal) => {
  const event = anEvent()
  return { ...event, activity: { ...activity, category: event.activity.category } }
}

describe("EventCard", () => {
  // Figma Karta akce/Foto řádek
  it("row: the activity photo with the small date tile, the line and the compact bar", async () => {
    const { container } = await renderWithRouter(<EventCard event={withActivity(florbal)} />)

    const photo = container.querySelector<HTMLElement>("[data-slot=event-photo]")!
    expect(photo).toHaveAttribute("aria-hidden", "true")
    expect(photo.querySelector("img")?.getAttribute("src")).toMatch(/florbal-480\.webp/)
    // one colour grade for the whole library (Figma: saturation −14 %, contrast +10 %)
    expect(photo.querySelector("img")).toHaveClass("saturate-86", "contrast-110")
    expect(within(photo).getByText("23")).toHaveClass("type-date-s")
    expect(screen.getByText("17:30 · Kavárna Pražírna · Praha 8")).toBeInTheDocument()
    expect(screen.queryByText("4 z 12 · min. 4")).not.toBeInTheDocument()
    expect(container.querySelector("[data-slot=capacity-track]")).toHaveClass("h-1.5")
  })

  // Figma Karta akce/Foto
  it("grid: the big date tile with the time, place · district, the numbers and the bar", async () => {
    const { container } = await renderWithRouter(
      <EventCard
        event={withActivity(florbal)}
        variant="grid"
      />,
    )

    const photo = container.querySelector<HTMLElement>("[data-slot=event-photo]")!
    expect(within(photo).getByText("23")).toHaveClass("type-date-m")
    expect(within(photo).getByText("17:30")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Language exchange: CZ/EN/ES" })).toHaveClass(
      "type-card-title",
    )
    expect(screen.getByText("Kavárna Pražírna · Praha 8")).toBeInTheDocument()
    expect(screen.getByText("4 z 12 · min. 4")).toBeInTheDocument()
  })

  it("an activity without a photo in the library shows its Activity tile", async () => {
    const { container } = await renderWithRouter(<EventCard event={withActivity(fishing)} />)

    const photo = container.querySelector<HTMLElement>("[data-slot=event-photo]")!
    expect(photo.querySelector("img")).toBeNull()
    expect(photo).toHaveClass("bg-background")
    expect(photo.querySelector(".border-tile-border")).not.toBeNull()
  })

  // DESIGN.md › Event card: selected without changing size
  it("a selected card gets a 2 px foreground ring, no new border width", async () => {
    await renderWithRouter(
      <EventCard
        event={anEvent()}
        isHighlighted
      />,
    )

    expect(screen.getByRole("article")).toHaveClass("ring-2", "ring-foreground", "border")
  })

  it("a cancelled event shows only its count and no bar", async () => {
    const { container } = await renderWithRouter(
      <EventCard
        event={{ ...anEvent({ approvedCount: 2, missingToMin: 2 }), status: "cancelled" }}
        variant="grid"
        status={{ kind: "cancelled" }}
      />,
    )

    expect(screen.getByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getByText("2 z 12")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=capacity-track]")).toBeNull()
  })
})
