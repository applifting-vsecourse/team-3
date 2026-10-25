import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

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
    // Figma: Activity tile with the activity and its category
    expect(screen.getByText("Jazykový tandem")).toBeInTheDocument()
    expect(screen.getByText(/Procvičte si angličtinu/)).toBeInTheDocument()
    expect(screen.getByText("Pá 23. 10. · 17:30")).toBeInTheDocument()
    expect(screen.getByText("Kavárna Pražírna, Dělnická 12, Praha 8")).toBeInTheDocument()
    expect(screen.getByLabelText("Místo akce na mapě")).toBeInTheDocument()
    expect(screen.getByText("Bez schválení")).toBeInTheDocument()
    expect(screen.getByText("Petra")).toBeInTheDocument()
    // „Pořádá“ names the role; no „Organizátor“ under a woman's name, no
    // „ověřený e-mail“ every organizer has
    expect(screen.queryByText(/Organizátor|ověřený e-mail/)).not.toBeInTheDocument()
    // without approval there is nothing for them to decide
    expect(screen.queryByText("Schvaluje žádosti o účast")).not.toBeInTheDocument()
    expect(screen.getByText("Chybí ještě 1")).toBeInTheDocument()
    expect(screen.getByText("3 z 12 · min. 4")).toBeInTheDocument()
    // „Kdo jde“ as the viewer's „Jdu“, not „Přihlášení“ next to „Přihlásit se“
    expect(screen.getByRole("heading", { name: "Kdo jde (3)" })).toBeInTheDocument()
    // the facts are a valid <dl> (Kdy, Kde, Přihlašování)
    expectValidDescriptionList(screen.getByText("Kdy").closest("dl")!)
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
    expect(screen.queryByRole("link", { name: "přihlášení" })).not.toBeInTheDocument()
  })

  it("shows only the count when the API sends no names (visitor variant), with a sign-in link back here", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ participants: null })}
        signInFrom={signInFrom}
      />,
    )

    expect(screen.getByRole("heading", { name: "Kdo jde (4)" })).toBeInTheDocument()
    expect(screen.queryByText("Jana Svobodová")).not.toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    const signIn = screen.getByRole("link", { name: "přihlášení" })
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
    // and who decides, under the organizer's name
    expect(screen.getByText("Schvaluje žádosti o účast")).toBeInTheDocument()
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
    afterEach(() => vi.unstubAllGlobals())

    // `a` comes before `b` in the document, i.e. in the reading order
    const inOrder = (...nodes: Node[]) =>
      nodes
        .slice(1)
        .every((node, i) =>
          Boolean(nodes[i]!.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
        )

    const renderDetail = async ({ isDesktop }: { isDesktop: boolean }) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: isDesktop,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
      await renderWithRouter(
        <EventDetailView
          event={anEventDetail({ approvedCount: 3, missingToMin: 1 })}
          signInFrom={signInFrom}
          participation={<button type="button">Přijdu</button>}
          organizerActions={<button type="button">Upravit</button>}
        />,
      )
      return screen.getByRole("region", { name: "Termín, místo a účast" })
    }

    it("desktop: the panel holds the capacity, the facts, the map and the actions, in this order", async () => {
      const panel = await renderDetail({ isDesktop: true })

      expect(
        inOrder(
          within(panel).getByText("Chybí ještě 1"),
          within(panel).getByText("Kdy"),
          within(panel).getByLabelText("Místo akce na mapě"),
          within(panel).getByRole("button", { name: "Přijdu" }),
          within(panel).getByRole("button", { name: "Sdílet odkaz" }),
          within(panel).getByRole("button", { name: "Upravit" }),
        ),
      ).toBe(true)
      // on the left: O akci → Kdo jde → Pořádá
      const left = ["O akci", "Kdo jde (3)", "Pořádá"].map((name) =>
        screen.getByRole("heading", { name }),
      )
      left.forEach((heading) => expect(panel).not.toContainElement(heading))
      expect(inOrder(...left)).toBe(true)
    })

    it("phone: the capacity right under the title, the action in the bar at the end", async () => {
      const panel = await renderDetail({ isDesktop: false })

      expect(
        inOrder(
          screen.getByRole("heading", { level: 1 }),
          within(panel).getByText("Chybí ještě 1"),
          within(panel).getByText("Kdy"),
          within(panel).getByLabelText("Místo akce na mapě"),
          screen.getByRole("heading", { name: "Pořádá" }),
          screen.getByRole("heading", { name: "O akci" }),
          screen.getByRole("heading", { name: "Kdo jde (3)" }),
          screen.getByRole("button", { name: "Přijdu" }),
        ),
      ).toBe(true)
      // the bar above the bottom navigation stays in sight while scrolling
      expect(screen.getByRole("button", { name: "Přijdu" }).parentElement).toHaveClass(
        "sticky",
        "bottom-16",
      )
      // sharing is at the top of the page on a phone (the route), not in the panel
      expect(screen.queryByRole("button", { name: /Sdílet/ })).not.toBeInTheDocument()
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
