import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventList } from "@/features/events/components/EventList"
import { anEvent } from "@/features/events/test/anEvent"

describe("EventList", () => {
  it("shows a card with title, date, place, status and facts", async () => {
    await renderWithRouter(<EventList events={[anEvent()]} />)

    expect(screen.getByText("1 akce")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Language exchange: CZ/EN/ES" })).toBeInTheDocument()
    expect(screen.getByText(/Pá 23\. 10\. · 17:30/)).toBeInTheDocument()
    expect(screen.getByText(/Kavárna Pražírna$/)).toBeInTheDocument()
    expect(screen.getByText("Volná místa")).toBeInTheDocument()
    expect(screen.getByText("4/12 · Praha 8")).toBeInTheDocument()
  })

  it("the card's title links to the event's detail", async () => {
    await renderWithRouter(<EventList events={[anEvent({ id: "cm-e1" })]} />)

    expect(screen.getByRole("link", { name: "Language exchange: CZ/EN/ES" })).toHaveAttribute(
      "href",
      "/akce/cm-e1",
    )
  })

  it("labels events that miss people and full events", async () => {
    await renderWithRouter(
      <EventList
        events={[
          anEvent({ id: "e1", approvedCount: 3, missingToMin: 1 }),
          anEvent({ id: "e2", approvedCount: 12, freeSpots: 0, isFull: true }),
        ]}
      />,
    )

    expect(screen.getByText("Chybí 1")).toBeInTheDocument()
    expect(screen.getByText("Plno")).toBeInTheDocument()
    expect(screen.getByText("2 akce")).toBeInTheDocument()
  })

  it("reports the hovered card, so the map can highlight its pin", async () => {
    const onHighlight = vi.fn()
    await renderWithRouter(
      <EventList
        events={[anEvent()]}
        onHighlight={onHighlight}
      />,
    )

    const card = screen.getByRole("article")
    await userEvent.hover(card)
    expect(onHighlight).toHaveBeenLastCalledWith("e1")
    await userEvent.unhover(card)
    expect(onHighlight).toHaveBeenLastCalledWith(undefined)
  })

  it("keeps cards below the closed mobile panel rendered but inert", async () => {
    await renderWithRouter(
      <EventList
        events={[anEvent({ id: "e1" }), anEvent({ id: "e2", title: "Deskovky po práci" })]}
        inertAfter={1}
      />,
    )

    expect(screen.getByText("2 akce")).toBeInTheDocument()
    const [first, second] = screen.getAllByRole("listitem")
    expect(first).not.toHaveAttribute("inert")
    expect(first).toHaveAttribute("data-peek-end")
    expect(second).toHaveAttribute("inert")
  })

  it("offers „Zrušit filtry“ by the count only when a filter is active", async () => {
    const onClearFilters = vi.fn()
    const { rerender } = render(<EventList events={[]} />)
    expect(screen.queryByRole("button", { name: "Zrušit filtry" })).not.toBeInTheDocument()

    rerender(
      <EventList
        events={[]}
        onClearFilters={onClearFilters}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Zrušit filtry" }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it("shows a skeleton while loading", () => {
    render(
      <EventList
        events={[]}
        isLoading
      />,
    )

    expect(screen.getByLabelText("Načítám akce")).toBeInTheDocument()
    expect(screen.queryByText(/akcí|akce$/)).not.toBeInTheDocument()
  })

  it("says in one sentence that nothing matches", () => {
    render(<EventList events={[]} />)

    expect(screen.getByText("0 akcí")).toBeInTheDocument()
    expect(
      screen.getByText("Pro zvolené filtry teď nejsou žádné nadcházející akce."),
    ).toBeInTheDocument()
  })

  it("shows an error with a working retry button", async () => {
    const onRetry = vi.fn()
    render(
      <EventList
        events={[]}
        error={new Error("Server neodpovídá")}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Akce se nepodařilo načíst")).toBeInTheDocument()
    // a sentence for people, not ky's URL and status code
    expect(screen.getByText("Zkontrolujte připojení a zkuste to znovu.")).toBeInTheDocument()
    expect(screen.queryByText("Server neodpovídá")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
