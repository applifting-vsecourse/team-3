import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventList } from "@/features/events/components/EventList"
import { anEvent } from "@/features/events/test/anEvent"

describe("EventList", () => {
  // Figma Karta akce/Foto řádek: time · place · district, the badge and the bar
  it("shows a row card with title, date, place, status and the bar", async () => {
    const { container } = await renderWithRouter(<EventList events={[anEvent()]} />)

    expect(screen.getByText("1 akce")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Language exchange: CZ/EN/ES" })).toBeInTheDocument()
    // the date tile is a picture; the date is said in full for a screen reader
    expect(screen.getByText("Pá 23. 10. · 17:30")).toHaveClass("sr-only")
    expect(screen.getByText("17:30 · Kavárna Pražírna · Praha 8")).toBeInTheDocument()
    expect(screen.getByText("8 volných míst")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=capacity-track]")).not.toBeNull()
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
    // the badge says what is missing; the line doesn't repeat it (#189)
    expect(screen.queryByText(/chybí 1 ·/)).not.toBeInTheDocument()
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

  it("the lowest mobile panel („map“): an empty list's block is inert, the count row is not", () => {
    const empty = (
      <div>
        <p>Žádná nadcházející akce neodpovídá filtrům:</p>
        <button type="button">Založit akci</button>
      </div>
    )
    const { rerender } = render(
      <EventList
        events={[]}
        empty={empty}
        onClearFilters={vi.fn()}
        inertAfter={0}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Založit akci", hidden: true }).closest("[inert]"),
    ).not.toBeNull()
    expect(screen.getByRole("button", { name: "Zrušit filtry" }).closest("[inert]")).toBeNull()

    // „peek“ shows the whole block, „list“ everything
    for (const inertAfter of [1, undefined]) {
      rerender(
        <EventList
          events={[]}
          empty={empty}
          onClearFilters={vi.fn()}
          inertAfter={inertAfter}
        />,
      )
      expect(screen.getByRole("button", { name: "Založit akci" }).closest("[inert]")).toBeNull()
    }
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

  it("an empty list shows the page's own empty state when it has one", () => {
    render(
      <EventList
        events={[]}
        empty={<p data-peek-end>Žádná nadcházející akce neodpovídá filtrům:</p>}
      />,
    )

    expect(screen.getByText("0 akcí")).toBeInTheDocument()
    expect(screen.getByText("Žádná nadcházející akce neodpovídá filtrům:")).toBeInTheDocument()
    expect(
      screen.queryByText("Pro zvolené filtry teď nejsou žádné nadcházející akce."),
    ).not.toBeInTheDocument()
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
    expect(screen.getByText("Zkontroluj připojení a zkus to znovu.")).toBeInTheDocument()
    expect(screen.queryByText("Server neodpovídá")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("Proběhlé: past cards with how each ended and its rating (#61, Figma A-02h)", async () => {
    const { container } = await renderWithRouter(
      <EventList
        isPast
        events={[
          anEvent({
            id: "e1",
            title: "Volejbal na Letné",
            approvedCount: 5,
            missingToMin: 0,
            rating: { average: 4.5, count: 3 },
          }),
          anEvent({
            id: "e2",
            title: "Volejbal ve Stromovce",
            approvedCount: 2,
            missingToMin: 2,
            rating: { average: null, count: 0 },
          }),
        ]}
      />,
    )

    expect(screen.getByText("2 proběhlé akce")).toBeInTheDocument()
    expect(screen.getByText("Proběhlo")).toBeInTheDocument()
    expect(screen.getByText("Sešlo se 5 lidí · ★ 4,5 (3 hodnocení)")).toBeInTheDocument()
    expect(screen.getByText("Nekonalo se")).toBeInTheDocument()
    expect(screen.getByText("Do minima chyběli 2 lidé")).toBeInTheDocument()
    expect(container.querySelector("[data-slot=capacity-track]")).toBeNull()
    expect(screen.getByRole("link", { name: "Volejbal na Letné" })).toHaveAttribute(
      "href",
      "/akce/e1",
    )
  })
})
