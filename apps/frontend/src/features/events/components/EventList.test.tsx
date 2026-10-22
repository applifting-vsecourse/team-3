import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EventList } from "@/features/events/components/EventList"
import { anEvent } from "@/features/events/test/anEvent"

describe("EventList", () => {
  it("shows a card with title, date, place, status and facts", () => {
    render(<EventList events={[anEvent()]} />)

    expect(screen.getByText("1 akce")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Language exchange: CZ/EN/ES" })).toBeInTheDocument()
    expect(screen.getByText(/Pá 23\. 10\. · 17:30/)).toBeInTheDocument()
    expect(screen.getByText(/Kavárna Pražírna$/)).toBeInTheDocument()
    expect(screen.getByText("Volná místa")).toBeInTheDocument()
    expect(screen.getByText("4/12 · Praha 8")).toBeInTheDocument()
  })

  it("labels events that miss people and full events", () => {
    render(
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
    render(
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

  it("shows only the first card in the closed mobile panel, with the full count", () => {
    render(
      <EventList
        events={[anEvent({ id: "e1" }), anEvent({ id: "e2", title: "Deskovky po práci" })]}
        limit={1}
      />,
    )

    expect(screen.getByText("2 akce")).toBeInTheDocument()
    expect(screen.getAllByRole("article")).toHaveLength(1)
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
    expect(screen.getByText("Server neodpovídá")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
