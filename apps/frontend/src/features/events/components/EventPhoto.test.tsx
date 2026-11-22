import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventPhoto } from "@/features/events/components/EventPhoto"
import { anEvent } from "@/features/events/test/anEvent"

describe("EventPhoto: the activity on the card (#348)", () => {
  it.each(["row", "past", "grid", "responsive"] as const)(
    "%s shows the activity's name over the photo, read by a screen reader",
    async (variant) => {
      const event = anEvent()
      const { container } = await renderWithRouter(
        <EventPhoto
          event={event}
          variant={variant}
        />,
      )

      const photo = container.querySelector<HTMLElement>("[data-slot=event-photo]")!
      for (const tag of within(photo).getAllByText(event.activity.name)) {
        expect(tag).toHaveClass("border-tile-border", "truncate")
        expect(tag.closest("[aria-hidden]")).toBeNull()
      }
    },
  )

  it("a row puts it at the bottom, under the date tile; the grid card at the top", async () => {
    const event = anEvent()
    await renderWithRouter(
      <>
        <EventPhoto
          event={event}
          variant="row"
        />
        <EventPhoto
          event={event}
          variant="grid"
        />
      </>,
    )

    const [row, grid] = screen.getAllByText(event.activity.name)
    expect(row).toHaveClass("bottom-1.5", "left-1.5")
    expect(grid).toHaveClass("top-3", "left-3")
  })
})
