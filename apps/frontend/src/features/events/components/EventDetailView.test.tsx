import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

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
    expect(screen.getByRole("heading", { name: "Přihlášení 3" })).toBeInTheDocument()
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

  it("a signed-in user sees who is coming", async () => {
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

  it("a visitor sees only the count, and a way to sign in that comes back here", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ participants: null })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByRole("heading", { name: "Přihlášení 4" })).toBeInTheDocument()
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

  it("shows a skeleton while loading", async () => {
    await renderWithRouter(
      <EventDetailView
        isLoading
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByLabelText("Načítám akci")).toBeInTheDocument()
  })

  it("an unknown or members-only event is „not found“, with a way to the list", async () => {
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
