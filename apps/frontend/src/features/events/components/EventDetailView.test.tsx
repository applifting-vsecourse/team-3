import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { expectValidDescriptionList } from "@/test/expectValidDescriptionList"
import { renderWithRouter } from "@/test/renderWithRouter"

import { EventDetailView } from "@/features/events/components/EventDetailView"
import { anEventDetail } from "@/features/events/test/anEvent"

const signInFrom = encodeURIComponent("/akce/e1")

describe("EventDetailView", () => {
  it("shows what, when, where, who organizes it and how many are coming", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ approvedCount: 3, missingToMin: 1 })}
        signInFrom={signInFrom}
      />,
    )

    expect(
      screen.getByRole("heading", { level: 1, name: "Language exchange: CZ/EN/ES" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Jazykový tandem")).toBeInTheDocument()
    expect(screen.getByText(/Procvičte si angličtinu/)).toBeInTheDocument()
    expect(screen.getByText("Pá 23. 10. · 17:30")).toBeInTheDocument()
    expect(screen.getByText("Kavárna Pražírna, Dělnická 12, Praha 8")).toBeInTheDocument()
    expect(screen.getByLabelText("Místo akce na mapě")).toBeInTheDocument()
    expect(screen.getByText("Bez schválení")).toBeInTheDocument()
    expect(screen.getByText("Petra")).toBeInTheDocument()
    expect(screen.getByText("Chybí ještě 1")).toBeInTheDocument()
    expect(screen.getByText("3 z 12 · min. 4")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Účastníci 3" })).toBeInTheDocument()
    // the facts are a valid <dl> (Termín, Místo, Přihlašování)
    expectValidDescriptionList(screen.getByText("Termín").closest("dl")!)
  })

  it.each([
    [{ approvedCount: 4, missingToMin: 0, freeSpots: 8 }, "Volná místa: 8"],
    [{ approvedCount: 12, missingToMin: 0, freeSpots: 0, isFull: true }, "Plno"],
  ])("shows the occupancy %o as „%s“", async (capacity, label) => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail(capacity)}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("lists the participants when the API sends their names (signed-in variant)", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail()}
        signInFrom={signInFrom}
      />,
    )

    const list = screen.getByRole("list")
    expect(within(list).getAllByRole("listitem")).toHaveLength(4)
    expect(within(list).getByText("Jana Svobodová")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "přihlášení k účtu" })).not.toBeInTheDocument()
  })

  it("shows only the count when the API sends no names (visitor variant), with a sign-in link back here", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ participants: null })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByRole("heading", { name: "Účastníci 4" })).toBeInTheDocument()
    expect(screen.queryByText("Jana Svobodová")).not.toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    const signIn = screen.getByRole("link", { name: "přihlášení k účtu" })
    expect(signIn.getAttribute("href")).toMatch(/^\/login\?from=/)
    expect(
      decodeURIComponent(
        new URL(signIn.getAttribute("href")!, "http://x").searchParams.get("from")!,
      ),
    ).toBe("/akce/e1")
  })

  it("says when nobody has joined yet", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ approvedCount: 0, missingToMin: 4, participants: [] })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByText("Zatím se nikdo nepřihlásil.")).toBeInTheDocument()
  })

  it("a group's event is organized by the group", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ group: { id: "g1", name: "Tandem Praha" } })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByText("Tandem Praha")).toBeInTheDocument()
    expect(screen.getByText("Skupina")).toBeInTheDocument()
    expect(screen.queryByText("Petra")).not.toBeInTheDocument()
  })

  it("names the approval when the organizer approves, and leaves out an empty description", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ approvalMode: "approval", description: null })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByText("Se schválením organizátora")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "O akci" })).not.toBeInTheDocument()
  })

  it("a cancelled event keeps its detail with the „Zrušeno“ label and the reason, not the capacity", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ status: "cancelled", cancelReason: "Herna má zavřeno." })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByText("Zrušeno")).toBeInTheDocument()
    expect(screen.getByText("Akce je zrušená")).toBeInTheDocument()
    expect(screen.getByText("Herna má zavřeno.")).toBeInTheDocument()
    expect(screen.queryByText("4 z 12 · min. 4")).not.toBeInTheDocument()
  })

  it("shows the organizer's actions the page passes in", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail()}
        signInFrom={signInFrom}
        organizerActions={<button type="button">Zrušit akci</button>}
      />,
    )

    expect(screen.getByRole("button", { name: "Zrušit akci" })).toBeInTheDocument()
  })

  describe("layout (Figma A-05, A-05d)", () => {
    // `a` comes before `b` in the document, i.e. in the reading order on a phone
    const isBefore = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

    const renderDetail = () =>
      renderWithRouter(
        <EventDetailView
          event={anEventDetail({ approvedCount: 3, missingToMin: 1 })}
          signInFrom={signInFrom}
          participation={<button type="button">Přijdu</button>}
          organizerActions={<button type="button">Upravit</button>}
        />,
      )

    it("the panel holds the facts, the map, the capacity and the action, in this order", async () => {
      await renderDetail()
      const panel = screen.getByRole("region", { name: "Termín, místo a účast" })

      const facts = within(panel).getByText("Termín")
      const map = within(panel).getByLabelText("Místo akce na mapě")
      const capacity = within(panel).getByText("Chybí ještě 1")
      const action = within(panel).getByRole("button", { name: "Přijdu" })
      const organizerAction = within(panel).getByRole("button", { name: "Upravit" })
      expect(isBefore(facts, map)).toBe(true)
      expect(isBefore(map, capacity)).toBe(true)
      expect(isBefore(capacity, action)).toBe(true)
      expect(isBefore(action, organizerAction)).toBe(true)
    })

    it("on a phone the title comes first, then the panel, then the main content", async () => {
      await renderDetail()
      const title = screen.getByRole("heading", { level: 1 })
      const panel = screen.getByRole("region", { name: "Termín, místo a účast" })

      expect(isBefore(title, panel)).toBe(true)
      for (const name of ["Pořádá", "O akci", "Účastníci 3"]) {
        const heading = screen.getByRole("heading", { name })
        // the main content is outside the panel (left on desktop), after it on a phone
        expect(panel).not.toContainElement(heading)
        expect(isBefore(panel, heading)).toBe(true)
      }
    })
  })

  it("shows a skeleton while loading", async () => {
    await renderWithRouter(
      <EventDetailView
        isLoading
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByLabelText("Načítám akci")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Detail akce" })).toBeInTheDocument()
  })

  it("renders „not found“ with a way to the list (the 404 detection is in useEventDetail)", async () => {
    await renderWithRouter(
      <EventDetailView
        isNotFound
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Akce nenalezena" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Prohlédnout akce" })).toHaveAttribute("href", "/akce")
  })

  it("shows an error with a working retry button", async () => {
    const onRetry = vi.fn()
    await renderWithRouter(
      <EventDetailView
        error={new Error("Server neodpovídá")}
        onRetry={onRetry}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByText("Akci se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.queryByText("Server neodpovídá")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
