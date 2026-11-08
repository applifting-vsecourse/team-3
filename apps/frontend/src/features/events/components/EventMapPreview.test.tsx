import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventMapPreview } from "@/features/events/components/EventMapPreview"
import { anEvent } from "@/features/events/test/anEvent"

const event = anEvent({
  id: "e7",
  title: "Večerní běh Letnou s čelovkou",
  summary: "Kolem 8 km po Letné a Stromovce, tempo pohodové…",
  missingToMin: 1,
})

describe("EventMapPreview (#56)", () => {
  it("desktop: the card with a line of the description, a link to the detail", async () => {
    await renderWithRouter(
      <EventMapPreview
        event={event}
        isDesktop
      />,
    )

    const preview = screen.getByRole("region", { name: "Náhled akce" })
    expect(within(preview).getByRole("link", { name: event.title })).toHaveAttribute(
      "href",
      "/akce/e7",
    )
    expect(within(preview).getByText(event.summary!)).toBeInTheDocument()
  })

  it("phone: the list's row card with the time and place, and the description under them", async () => {
    await renderWithRouter(
      <EventMapPreview
        event={event}
        isDesktop={false}
      />,
    )

    const preview = screen.getByRole("region", { name: "Náhled akce" })
    expect(within(preview).getByRole("link", { name: event.title })).toBeInTheDocument()
    const line = within(preview).getByText(/^17:30 · /)
    const summary = within(preview).getByText(event.summary!)
    // the time and the place first, the description after them, at most two lines
    expect(line.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(summary).toHaveClass("line-clamp-2")
  })
})
