import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { expectValidDescriptionList } from "@/test/expectValidDescriptionList"
import { renderWithRouter } from "@/test/renderWithRouter"

import { EventDetailView } from "@/features/events/components/EventDetailView"
import { anEventDetail } from "@/features/events/test/anEvent"

// the fixture starts Fri 23. 10. 2026 17:30 Prague time
const beforeStart = new Date("2026-10-23T08:00:00.000Z")

const stubDesktop = (isDesktop: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: isDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))

describe("EventDetailView", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("shows what, when, where, who organizes it and how many are coming", async () => {
    await renderWithRouter(
      <EventDetailView event={anEventDetail({ approvedCount: 3, missingToMin: 1 })} />,
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
    expect(screen.getByText("3 z 12")).toBeInTheDocument()
    expect(screen.getByText("min. 4")).toBeInTheDocument()
    // „Kdo jde“ as the viewer's „Jdu“, not „Přihlášení“ next to „Přihlásit se“
    expect(screen.getByRole("heading", { name: "Kdo jde · 3 z 12" })).toBeInTheDocument()
    // the facts are a valid <dl> (Kdy, Kde, Přihlašování)
    expectValidDescriptionList(screen.getByText("Kdy").closest("dl")!)
  })

  it.each([
    [{ approvedCount: 4, missingToMin: 0, freeSpots: 8 }, "8 volných míst"],
    [{ approvedCount: 11, missingToMin: 0, freeSpots: 1 }, "1 volné místo"],
    [{ approvedCount: 12, missingToMin: 0, freeSpots: 0, isFull: true }, "Plno"],
  ])("shows the occupancy %o as „%s“", async (capacity, label) => {
    await renderWithRouter(<EventDetailView event={anEventDetail(capacity)} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("lists the participants when the API sends their names (someone taking part, #174)", async () => {
    await renderWithRouter(<EventDetailView event={anEventDetail()} />)

    expect(screen.getByRole("heading", { name: "Kdo jde · 4 z 12" })).toBeInTheDocument()
    const list = screen.getByRole("list")
    expect(within(list).getAllByRole("listitem")).toHaveLength(4)
    expect(within(list).getByText("Jana Svobodová")).toBeInTheDocument()
  })

  it.each([
    [{ approvedCount: 4, missingToMin: 0, freeSpots: 8 }, "8 volných míst"],
    [{ approvedCount: 2, missingToMin: 2, freeSpots: 10 }, "Chybí ještě 2"],
    [{ approvedCount: 12, missingToMin: 0, freeSpots: 0, isFull: true }, "Plno"],
  ])(
    "without the names (#174) shows the occupancy %o as „%s“ and only the count in „Kdo jde“",
    async (capacity, label) => {
      await renderWithRouter(
        <EventDetailView event={anEventDetail({ ...capacity, participants: null })} />,
      )

      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: /^Kdo jde · \d+ z 12$/ })).toBeInTheDocument()
      expect(screen.queryByText("Jana Svobodová")).not.toBeInTheDocument()
      // Figma A-05d: when the names show — signing in alone doesn't do it
      expect(screen.getByText("Jména uvidíš, až budeš na akci.")).toBeInTheDocument()
    },
  )

  it("with a request waiting, the names show once the organizer approves it (Figma A-05)", async () => {
    await renderWithRouter(
      <EventDetailView event={anEventDetail({ participants: null, myParticipation: "pending" })} />,
    )

    expect(screen.getByText("Jména uvidíš, až tě organizátor schválí.")).toBeInTheDocument()
  })

  it("the band's line says when, where and how full (Figma A-05d)", async () => {
    stubDesktop(true)
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ approvedCount: 3, missingToMin: 1 })}
        now={beforeStart}
      />,
    )

    expect(screen.getByText(/^Pá 23\. 10\. · 17:30 · .+ · do minima chybí 1$/)).toBeInTheDocument()
  })

  it("puts the viewer first as „Ty“ and names everyone under the avatars (Figma A-05c)", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail()}
        viewerId="u4"
      />,
    )

    const names = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((item) => item.textContent)
    expect(names).toEqual(["LČTy", "JSJana Svobodová", "TDTomáš Dvořák", "MNMarek Novák"])
    expect(screen.getByText("Ty, Jana Svobodová, Tomáš Dvořák, Marek Novák")).toBeInTheDocument()
  })

  it("a cancelled event without the names promises none", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ status: "cancelled", cancelReason: "Prší.", participants: null })}
      />,
    )

    expect(screen.queryByRole("heading", { name: /Kdo jde/ })).not.toBeInTheDocument()
  })

  it("nobody joined yet: says so to a visitor too, instead of promising names (review #269)", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ approvedCount: 0, missingToMin: 4, participants: null })}
      />,
    )

    expect(screen.getByText("Zatím se nikdo nepřihlásil.")).toBeInTheDocument()
    expect(screen.queryByText(/Jména uvidíš/)).not.toBeInTheDocument()
  })

  it("says when nobody has joined yet", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ approvedCount: 0, missingToMin: 4, participants: [] })}
      />,
    )

    expect(screen.getByText("Zatím se nikdo nepřihlásil.")).toBeInTheDocument()
  })

  it("a group's event is organized by the group, linked to its page, and says who sees it (#70, A-05g)", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({
          group: { id: "g1", name: "Tandem Praha" },
          visibility: "members",
        })}
      />,
    )

    expect(screen.getByRole("link", { name: "Tandem Praha" })).toHaveAttribute(
      "href",
      "/skupiny/g1",
    )
    expect(screen.queryByText("Petra")).not.toBeInTheDocument()
    expect(screen.getByText("Kdo akci vidí")).toBeInTheDocument()
    expect(screen.getByText("Jen pro členy skupiny")).toBeInTheDocument()
  })

  it("a group's event shows the group's card the page passes in, once loaded", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ group: { id: "g1", name: "Tandem Praha" } })}
        organizerGroup={<p>Karta skupiny</p>}
      />,
    )

    expect(screen.getByText("Karta skupiny")).toBeInTheDocument()
    expect(screen.getByText("Veřejná")).toBeInTheDocument()
  })

  it("a person's event doesn't say who sees it", async () => {
    await renderWithRouter(<EventDetailView event={anEventDetail()} />)

    expect(screen.queryByText("Kdo akci vidí")).not.toBeInTheDocument()
  })

  it("names the approval when the organizer approves, and leaves out an empty description", async () => {
    await renderWithRouter(
      <EventDetailView event={anEventDetail({ approvalMode: "approval", description: null })} />,
    )

    expect(screen.getByText("Se schválením organizátora")).toBeInTheDocument()
    // and who decides, under the organizer's name
    expect(screen.getByText("Schvaluje žádosti o účast")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "O akci" })).not.toBeInTheDocument()
  })

  it("a cancelled event keeps its detail with the reason, not the capacity", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail({ status: "cancelled", cancelReason: "Herna má zavřeno." })}
      />,
    )

    expect(screen.getByText(/ · akce je zrušená$/)).toBeInTheDocument()
    expect(screen.getByText("Akce je zrušená")).toBeInTheDocument()
    // who was coming still matters to those who had the names (#43); review #269
    expect(screen.getByRole("heading", { name: /Kdo jde/ })).toBeInTheDocument()
    expect(screen.getByText("Herna má zavřeno.")).toBeInTheDocument()
    expect(screen.queryByText("4 z 12")).not.toBeInTheDocument()
    expect(screen.queryByText("min. 4")).not.toBeInTheDocument()
    // it no longer happens, whatever its numbers say
    expect(screen.queryByText("Koná se")).not.toBeInTheDocument()
  })

  // DESIGN.md › Koná se stamp: only once the minimum is reached, full included
  it.each([
    [{ approvedCount: 3, missingToMin: 1 }, false],
    [{ approvedCount: 4, missingToMin: 0 }, true],
    [{ approvedCount: 12, missingToMin: 0, freeSpots: 0, isFull: true }, true],
  ])("with %o the „Koná se“ stamp shows: %s", async (numbers, isShown) => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail(numbers)}
        now={beforeStart}
      />,
    )

    expect(Boolean(screen.queryByText("Koná se"))).toBe(isShown)
  })

  it("an event that is over has no „Koná se“ stamp, its minimum reached or not (Figma A-05h)", async () => {
    const event = anEventDetail({ approvedCount: 4, missingToMin: 0 })
    await renderWithRouter(
      <EventDetailView
        event={event}
        // without an end time it is over once its day ends (review #269)
        now={new Date("2026-10-24T08:00:00.000Z")}
      />,
    )

    expect(screen.queryByText("Koná se")).not.toBeInTheDocument()
  })

  it("shows the organizer's actions the page passes in", async () => {
    await renderWithRouter(
      <EventDetailView
        event={anEventDetail()}
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
      stubDesktop(isDesktop)
      await renderWithRouter(
        <EventDetailView
          event={anEventDetail({ approvedCount: 3, missingToMin: 1 })}
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
      const left = ["O akci", "Kdo jde · 3 z 12", "Pořádá"].map((name) =>
        screen.getByRole("heading", { name }),
      )
      left.forEach((heading) => expect(panel).not.toContainElement(heading))
      expect(inOrder(...left)).toBe(true)
    })

    it("phone: sharing at the top, the capacity right under the title, the action in the bar at the end", async () => {
      const panel = await renderDetail({ isDesktop: false })

      expect(
        inOrder(
          screen.getByRole("button", { name: "Sdílet" }),
          screen.getByRole("heading", { level: 1 }),
          within(panel).getByText("Chybí ještě 1"),
          within(panel).getByText("Kdy"),
          within(panel).getByLabelText("Místo akce na mapě"),
          screen.getByRole("heading", { name: "O akci" }),
          screen.getByRole("heading", { name: "Kdo jde · 3 z 12" }),
          screen.getByRole("heading", { name: "Pořádá" }),
          screen.getByRole("button", { name: "Přijdu" }),
        ),
      ).toBe(true)
      // the bar above the bottom navigation stays in sight while scrolling
      expect(screen.getByRole("button", { name: "Přijdu" }).parentElement).toHaveClass(
        "sticky",
        "bottom-16",
      )
      // sharing is in the bar at the top on a phone (Header/Sub), not in the panel
      expect(within(panel).queryByRole("button", { name: /Sdílet/ })).not.toBeInTheDocument()
    })
  })

  it("shows a skeleton while loading", async () => {
    await renderWithRouter(<EventDetailView isLoading />)

    expect(screen.getByLabelText("Načítám akci")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Detail akce" })).toBeInTheDocument()
  })

  it("renders „not found“ with a way to the list (the 404 detection is in useEventDetail)", async () => {
    await renderWithRouter(<EventDetailView isNotFound />)

    expect(screen.getByRole("heading", { level: 1, name: "Akce nenalezena" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Prohlédnout akce" })).toHaveAttribute("href", "/akce")
  })

  it("shows an error with a working retry button", async () => {
    const onRetry = vi.fn()
    await renderWithRouter(
      <EventDetailView
        error={new Error("Server neodpovídá")}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Akci se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.queryByText("Server neodpovídá")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
