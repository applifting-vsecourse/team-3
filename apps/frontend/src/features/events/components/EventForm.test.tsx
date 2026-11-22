import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Catalog } from "@/lib/catalog/catalogSearch"

import { EventForm } from "@/features/events/components/EventForm"
import { CLOCK_TIME_ERROR } from "@/features/events/lib/clockTime"
import { eventTimes, toPragueWallTime } from "@/features/events/lib/pragueTime"

const catalog: Catalog = {
  localities: [
    { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.08, lng: 14.44 },
    {
      id: "l-praha-8",
      slug: "praha-8",
      name: "Praha 8",
      parentId: "l-praha",
      lat: 50.11,
      lng: 14.47,
    },
    {
      id: "l-praha-9",
      slug: "praha-9",
      name: "Praha 9",
      parentId: "l-praha",
      lat: 50.1224,
      lng: 14.489,
    },
    {
      id: "l-usti-nad-orlici",
      slug: "usti-nad-orlici",
      name: "Ústí nad Orlicí",
      parentId: null,
      lat: 49.9739,
      lng: 16.3936,
    },
    { id: "l-louny", slug: "louny", name: "Louny", parentId: null, lat: 50.3573, lng: 13.7969 },
  ],
  categories: [
    {
      id: "c-pohyb",
      slug: "pohyb-a-tanec",
      name: "Pohyb a tanec",
      icon: "route",
      activities: [
        { id: "a-atletika", slug: "atletika", name: "Atletika", keywords: ["závody", "sprint"] },
      ],
    },
    {
      id: "c-hry",
      slug: "hry",
      name: "Hry",
      icon: "dice",
      activities: [{ id: "a-deskove-hry", slug: "deskove-hry", name: "Deskové hry", keywords: [] }],
    },
  ],
}

const renderForm = (props: Partial<Parameters<typeof EventForm>[0]> = {}) => {
  const onSubmit = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <EventForm
        catalog={catalog}
        isSubmitting={false}
        onSubmit={onSubmit}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onSubmit }
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Zveřejnit akci" }))

/** All other fields are valid, so tests exercise the time and submitted instants. */
const renderTimedForm = (mode: "create" | "edit" = "create") => {
  const day = toPragueWallTime(new Date(Date.now() + 3 * 86_400_000)).split("T")[0]!
  const result = renderForm({
    mode,
    initialValues: {
      title: "Ranní setkání",
      activityId: "a-deskove-hry",
      localityId: "l-praha-8",
      address: "Herna Karlín",
      lat: 50.11,
      lng: 14.47,
      startsAt: eventTimes(day, "09:00", "").startsAt.toISOString(),
      minParticipants: 2,
      maxParticipants: 6,
    },
  })
  return {
    ...result,
    day,
    start: screen.getByLabelText("Začátek *"),
    end: screen.getByLabelText("Konec"),
  }
}

/** Opens a catalog field („Aktivita *“), types into its search and picks the best match. */
const pick = async (field: string, search: string, query: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: field }))
  await userEvent.type(screen.getByRole("combobox", { name: search }), query)
  await userEvent.keyboard("{Enter}")
}

/** The address service (Photon) answering with these places. */
const answerAddresses = (...features: object[]) => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(Response.json({ type: "FeatureCollection", features })),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const letenska = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [14.4072071, 50.0891477] },
  properties: {
    type: "house",
    osm_key: "place",
    countrycode: "CZ",
    housenumber: "525/15",
    street: "Letenská",
    district: "Malá Strana",
    city: "Praha",
  },
}
const krizikova = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [14.4538834, 50.0929902] },
  properties: {
    type: "house",
    osm_key: "place",
    countrycode: "CZ",
    housenumber: "53/52",
    street: "Křižíkova",
    locality: "Karlín",
    district: "Praha 8",
    city: "Praha",
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  // no test talks to the real address service
  answerAddresses()
})

afterEach(() => {
  vi.unstubAllGlobals()
  // the spies on scrollIntoView
  vi.restoreAllMocks()
})

describe("EventForm", () => {
  describe("24-hour time from the kit's Input (#200)", () => {
    it("keeps typing intact, normalizes on blur and accepts pasted numeric time", async () => {
      const user = userEvent.setup()
      const { start, end } = renderTimedForm()
      expect(start).toHaveAttribute("type", "text")
      expect(start).toHaveAttribute("inputmode", "numeric")
      expect(start).toHaveAccessibleDescription("Čas napiš jako 9:00 nebo 0900.")

      await user.clear(start)
      await user.type(start, "9:00")
      expect(start).toHaveValue("9:00")
      await user.tab()
      expect(start).toHaveValue("09:00")

      await user.click(end)
      await user.paste("1030")
      expect(end).toHaveValue("1030")
      await user.tab()
      expect(end).toHaveValue("10:30")
      expect(screen.queryByText(CLOCK_TIME_ERROR)).not.toBeInTheDocument()
      expect(screen.queryByText("Vyplň název akce")).not.toBeInTheDocument()
    })

    it.each(["create", "edit"] as const)(
      "%s normalizes both times on submit even without blur",
      async (mode) => {
        const { start, end, day, onSubmit } = renderTimedForm(mode)
        fireEvent.change(start, { target: { value: "9:00" } })
        fireEvent.change(end, { target: { value: "1030" } })
        fireEvent.submit(start.closest("form")!)
        await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
        const times = eventTimes(day, "09:00", "10:30")
        expect(onSubmit.mock.lastCall?.[0]).toMatchObject({
          startsAt: times.startsAt.toISOString(),
          endsAt: times.endsAt!.toISOString(),
        })
      },
    )

    it.each([
      ["Začátek *", "25:00"],
      ["Začátek *", "9:"],
      ["Konec", "9:99"],
      ["Konec", "12:00:00"],
    ])(
      "keeps invalid %s = %s visible, describes the error and refuses submission",
      async (label, value) => {
        const { onSubmit } = renderTimedForm()
        const field = screen.getByLabelText(label)
        await userEvent.clear(field)
        await userEvent.type(field, value)
        await userEvent.tab()
        expect(await screen.findByText(CLOCK_TIME_ERROR)).toBeInTheDocument()
        expect(field).toHaveValue(value)
        expect(field).toHaveAttribute("aria-invalid", "true")
        const hint = label === "Začátek *" ? "Čas napiš jako 9:00 nebo 0900." : "Nepovinné"
        expect(field).toHaveAccessibleDescription(`${hint} ${CLOCK_TIME_ERROR}`)
        await submit()
        expect(onSubmit).not.toHaveBeenCalled()
        expect(screen.queryByText("Termín musí být v budoucnosti")).not.toBeInTheDocument()

        await userEvent.clear(field)
        await userEvent.type(field, "11:00")
        await userEvent.tab()
        await waitFor(() => expect(screen.queryByText(CLOCK_TIME_ERROR)).not.toBeInTheDocument())
        expect(field).toHaveAttribute("aria-invalid", "false")
      },
    )

    it("compares canonical times and clears the end's equality error after correcting the start", async () => {
      const { start, end, onSubmit } = renderTimedForm()
      fireEvent.change(start, { target: { value: "9:00" } })
      fireEvent.change(end, { target: { value: "0900" } })
      fireEvent.submit(start.closest("form")!)
      expect(await screen.findByText("Konec musí být jiný než začátek")).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
      await userEvent.clear(start)
      await userEvent.type(start, "8:00")
      await userEvent.tab()
      await waitFor(() =>
        expect(screen.queryByText("Konec musí být jiný než začátek")).not.toBeInTheDocument(),
      )
    })

    it("normalizes before deciding that a compact end is on the next Prague day", async () => {
      const { start, end, day, onSubmit } = renderTimedForm()
      fireEvent.change(start, { target: { value: "2200" } })
      fireEvent.change(end, { target: { value: "200" } })
      fireEvent.submit(start.closest("form")!)
      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
      const times = eventTimes(day, "22:00", "02:00")
      expect(onSubmit.mock.lastCall?.[0]).toMatchObject({
        startsAt: times.startsAt.toISOString(),
        endsAt: times.endsAt!.toISOString(),
      })
    })

    it("keeps the end optional, including whitespace pasted into it", async () => {
      const { start, end, onSubmit } = renderTimedForm()
      fireEvent.change(end, { target: { value: "  " } })
      fireEvent.submit(start.closest("form")!)
      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
      expect(onSubmit.mock.lastCall?.[0]).toMatchObject({ endsAt: null })
    })

    it("distinguishes a missing start from invalid input and warns only for a valid early time", async () => {
      const { start, onSubmit } = renderTimedForm()
      const status = within(start.closest('[data-slot="form-item"]')!).getByRole("status")
      fireEvent.change(start, { target: { value: "03:99" } })
      expect(status).toBeEmptyDOMElement()
      fireEvent.change(start, { target: { value: "300" } })
      expect(status).toHaveTextContent("Začátek je mezi půlnocí a pátou ráno.")
      fireEvent.change(start, { target: { value: "5:00" } })
      expect(status).toBeEmptyDOMElement()
      fireEvent.change(start, { target: { value: "  " } })
      fireEvent.submit(start.closest("form")!)
      expect(await screen.findByText("Vyplň začátek")).toBeInTheDocument()
      expect(screen.queryByText(CLOCK_TIME_ERROR)).not.toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  const centerButton = () => screen.getByRole("button", { name: "Umístit špendlík do středu mapy" })
  const addressField = () => screen.getByLabelText("Adresa *")
  const centerAddress = { ...krizikova, geometry: { type: "Point", coordinates: [14.47, 50.11] } }

  it("fills empty address and locality without snapping the manually selected pin", async () => {
    answerAddresses({
      ...centerAddress,
      geometry: { type: "Point", coordinates: [14.4701, 50.1101] },
    })
    const { onSubmit } = renderForm({
      initialValues: {
        title: "Setkání",
        activityId: "a-deskove-hry",
        localityId: "l-praha-8",
        startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        minParticipants: 2,
        maxParticipants: 4,
      },
    })
    await userEvent.click(centerButton())
    await waitFor(() => expect(addressField()).toHaveValue("Křižíkova 53/52, Praha 8 – Karlín"))
    await submit()
    expect(onSubmit.mock.lastCall?.[0]).toMatchObject({
      lat: 50.11,
      lng: 14.47,
      localityId: "l-praha-8",
    })
  })

  it.each([true, false])("asks before replacing manual text; accept=%s", async (shouldAccept) => {
    answerAddresses(centerAddress)
    renderForm({ initialValues: { localityId: "l-praha-8", address: "Sraz u zadního vchodu" } })
    await userEvent.click(centerButton())
    await screen.findByRole("button", { name: "Použít adresu" })
    expect(addressField()).toHaveValue("Sraz u zadního vchodu")
    await userEvent.click(
      screen.getByRole("button", { name: shouldAccept ? "Použít adresu" : "Ponechat moji" }),
    )
    expect(addressField()).toHaveValue(
      shouldAccept ? "Křižíkova 53/52, Praha 8 – Karlín" : "Sraz u zadního vchodu",
    )
    expect(screen.queryByRole("button", { name: "Použít adresu" })).not.toBeInTheDocument()
  })

  it("clears an obsolete proposal as soon as the user types", async () => {
    answerAddresses(centerAddress)
    renderForm({ initialValues: { localityId: "l-praha-8", address: "Moje místo" } })
    await userEvent.click(centerButton())
    await screen.findByRole("button", { name: "Použít adresu" })
    await userEvent.type(addressField(), " u brány")
    expect(screen.queryByRole("button", { name: "Použít adresu" })).not.toBeInTheDocument()
    expect(addressField()).toHaveValue("Moje místo u brány")
  })

  it.each(["", "U vchodu do parku"])(
    "leaves %s intact when no address is found instead of inserting GPS",
    async (address) => {
      renderForm({ initialValues: { localityId: "l-louny", address } })
      await userEvent.click(centerButton())
      await screen.findByText(/Adresu se nepodařilo určit/)
      expect(addressField()).toHaveValue(address)
      expect(screen.getByRole("combobox", { name: "Lokalita *" })).toHaveTextContent("Louny")
    },
  )

  it("changing locality while editing preserves the address and exact point", async () => {
    const { onSubmit } = renderForm({
      mode: "edit",
      initialValues: {
        title: "Setkání",
        activityId: "a-deskove-hry",
        localityId: "l-praha-8",
        lat: 50.11,
        lng: 14.47,
        address: "Vlastní místo",
        startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        minParticipants: 2,
        maxParticipants: 4,
      },
    })
    await pick("Lokalita *", "Hledat lokalitu", "Ústí nad Orlicí")
    expect(addressField()).toHaveValue("Vlastní místo")
    const moveToLocality = screen.getByRole("button", { name: "Přesunout do středu lokality" })
    expect(moveToLocality).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))
    expect(onSubmit.mock.lastCall?.[0]).toMatchObject({
      localityId: "l-usti-nad-orlici",
      lat: 50.11,
      lng: 14.47,
      address: "Vlastní místo",
    })
    await userEvent.click(moveToLocality)
    await screen.findByText(/Adresu se nepodařilo určit/)
    await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))
    expect(onSubmit.mock.lastCall?.[0]).toMatchObject({
      localityId: "l-usti-nad-orlici",
      lat: 49.9739,
      lng: 16.3936,
      address: "Vlastní místo",
    })
  })

  it("choosing a locality alone does not satisfy the required map point", async () => {
    renderForm()
    await pick("Lokalita *", "Hledat lokalitu", "Louny")
    await submit()
    expect(await screen.findByText("Vyber místo na mapě")).toBeInTheDocument()
    expect(addressField()).toHaveValue("")
  })

  it("ignores a reverse lookup completed after manual typing", async () => {
    let resolveLookup!: (response: Response) => void
    const response = new Promise<Response>((resolve) => {
      resolveLookup = resolve
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response),
    )
    renderForm({ initialValues: { localityId: "l-praha-8" } })
    await userEvent.click(centerButton())
    await userEvent.type(addressField(), "Moje místo")
    await act(async () => {
      resolveLookup(Response.json({ features: [centerAddress] }))
      await response
    })
    expect(addressField()).toHaveValue("Moje místo")
    expect(screen.queryByRole("button", { name: "Použít adresu" })).not.toBeInTheDocument()
  })

  it("keeps address and locality when center button selects the existing pin", async () => {
    const fetchMock = answerAddresses()
    renderForm({
      initialValues: {
        localityId: "l-louny",
        lat: 50.3573,
        lng: 13.7969,
        address: "Sraz u radnice",
      },
    })
    await userEvent.click(centerButton())
    expect(addressField()).toHaveValue("Sraz u radnice")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("warns about a start before 5 AM without forbidding it", () => {
    renderForm()
    const field = screen.getByLabelText("Začátek *")
    expect(screen.queryByText(/Začátek je mezi půlnocí/)).not.toBeInTheDocument()
    fireEvent.change(field, { target: { value: "00:00" } })
    expect(screen.getByText(/Začátek je mezi půlnocí/)).toHaveAttribute("role", "status")
    fireEvent.change(field, { target: { value: "04:59" } })
    expect(screen.getByText(/Začátek je mezi půlnocí/)).toHaveAttribute("role", "status")
    fireEvent.change(field, { target: { value: "05:00" } })
    expect(screen.queryByText(/Začátek je mezi půlnocí/)).not.toBeInTheDocument()
  })

  it("an untouched form can be sent and says, under each field, what is missing", async () => {
    const { onSubmit } = renderForm()

    await submit()

    for (const message of [
      "Vyplň název akce",
      "Akce potřebuje aktivitu",
      "Akce potřebuje lokalitu",
      "Vyber místo na mapě",
      "Vyplň adresu",
      "Akce potřebuje datum",
      "Vyplň začátek",
      "Vyplň minimum",
      "Vyplň maximum",
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("„Bez schválení“ is the default way of joining; the choice is a named group", () => {
    renderForm()

    expect(screen.getByRole("radio", { name: /Bez schválení/ })).toBeChecked()
    expect(screen.getByRole("radiogroup", { name: "Způsob přihlašování *" })).toBeInTheDocument()
  })

  describe("an e-mail for each sign-up (#86, Figma D-01e)", () => {
    it("is offered, off, under an open event; an event with approval says requests come anyway", async () => {
      renderForm()

      const email = screen.getByRole("checkbox", { name: "Posílat mi e-mail ke každé přihlášce" })
      expect(email).not.toBeChecked()
      expect(email).toHaveAccessibleDescription("Upozornění v aplikaci dostaneš vždy.")

      await userEvent.click(screen.getByRole("radio", { name: /Schvaluji přihlášky/ }))

      expect(screen.queryByRole("checkbox", { name: /e-mail ke každé přihlášce/ })).toBeNull()
      expect(
        screen.getByText("Každá žádost ti přijde do upozornění i e-mailem."),
      ).toBeInTheDocument()
    })

    it("isn't in a fellow group admin's edit: it is the organizer's (review #398)", async () => {
      const { onSubmit } = renderForm({
        mode: "edit",
        initialValues: {
          title: "Deskovky po práci",
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          lat: 50.11,
          lng: 14.47,
          address: "Herna Karlín, Křižíkova 52, Praha 8",
          startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
          minParticipants: 3,
          maxParticipants: 6,
          approvalMode: "open",
        },
      })

      expect(screen.queryByRole("checkbox", { name: /e-mail ke každé přihlášce/ })).toBeNull()
      await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))

      expect(onSubmit).toHaveBeenCalledOnce()
      expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty("emailOnJoin")
    })

    it("can be changed when editing an open event, though the way of joining can't", async () => {
      const { onSubmit } = renderForm({
        mode: "edit",
        initialValues: {
          title: "Deskovky po práci",
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          lat: 50.11,
          lng: 14.47,
          address: "Herna Karlín, Křižíkova 52, Praha 8",
          startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
          minParticipants: 3,
          maxParticipants: 6,
          approvalMode: "open",
          emailOnJoin: true,
        },
      })

      const email = screen.getByRole("checkbox", { name: "Posílat mi e-mail ke každé přihlášce" })
      expect(email).toBeChecked()
      expect(email).toBeEnabled()
      await userEvent.click(email)
      await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ emailOnJoin: false }), {
        kind: "keep",
      })
    })
  })

  it("ties the place's error to the map", async () => {
    renderForm()

    await submit()

    const map = screen.getByRole("region", { name: "Místo na mapě *" })
    expect(map).toHaveAccessibleDescription("Vyber místo na mapě")
  })

  describe("errors stay on screen (#291)", () => {
    it("a failed submit scrolls to the first invalid field and focuses it once the scroll ends", async () => {
      renderForm()
      const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

      await submit()

      const title = screen.getByLabelText("Název akce *")
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
      expect(scrollIntoView.mock.contexts[0]).toBe(title)
      // the middle of the screen, clear of the sticky header
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
      // not react-hook-form's own focus at once: the page would jump before the scroll ends
      expect(title).not.toHaveFocus()

      window.dispatchEvent(new Event("scrollend"))

      expect(title).toHaveFocus()
    })

    it("a filled title moves the focus on to the activity", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("Název akce *"), "Deskovky po práci")
      await submit()

      await waitFor(() =>
        expect(screen.getByRole("combobox", { name: "Aktivita *" })).toHaveFocus(),
      )
    })

    it("Konec in the right half of its row comes before an empty Minimum in the row under it (review #330)", async () => {
      const start = new Date(Date.now() + 3 * 86_400_000)
      start.setSeconds(0, 0)
      renderForm({
        initialValues: {
          title: "Deskovky po práci",
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          lat: 50.11,
          lng: 14.47,
          address: "Herna Karlín",
          startsAt: start.toISOString(),
          // „Konec musí být jiný než začátek“
          endsAt: start.toISOString(),
          maxParticipants: 6,
        },
      })
      const at = (element: HTMLElement, left: number, top: number) =>
        vi
          .spyOn(element, "getBoundingClientRect")
          .mockReturnValue(DOMRect.fromRect({ x: left, y: top, width: 390, height: 44 }))
      // D-01d: Začátek | Konec, then Minimum | Maximum, all in the left column
      at(screen.getByLabelText("Začátek *"), 167, 976)
      at(screen.getByLabelText("Konec"), 575, 976)
      at(screen.getByLabelText("Minimum"), 167, 1165)
      at(screen.getByLabelText("Maximum"), 575, 1165)
      const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

      await submit()

      expect(await screen.findByText("Konec musí být jiný než začátek")).toBeInTheDocument()
      expect(screen.getByText("Vyplň minimum")).toBeInTheDocument()
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
      expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByLabelText("Konec"))
      window.dispatchEvent(new Event("scrollend"))
      expect(screen.getByLabelText("Konec")).toHaveFocus()
    })

    it("only the place missing: the map comes into view and takes the focus", async () => {
      renderForm({
        initialValues: {
          title: "Deskovky po práci",
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          address: "Herna Karlín",
          startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          minParticipants: 3,
          maxParticipants: 6,
        },
      })
      const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

      await submit()

      const map = screen.getByRole("region", { name: "Místo na mapě *" })
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
      expect(scrollIntoView.mock.contexts[0]).toBe(map)
      window.dispatchEvent(new Event("scrollend"))
      // Leaflet's container, which moves the map from the keyboard
      expect(map).toContainElement(document.activeElement as HTMLElement)
      expect(document.activeElement).toHaveClass("leaflet-container")
      expect(document.activeElement).toHaveAttribute("data-focus-target")
    })

    it("a server error comes into view as an alert, read out by a screen reader", () => {
      const client = new QueryClient()
      const props = { catalog, isSubmitting: false, onSubmit: vi.fn() }
      const { rerender } = render(
        <QueryClientProvider client={client}>
          <EventForm {...props} />
        </QueryClientProvider>,
      )
      const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")

      rerender(
        <QueryClientProvider client={client}>
          <EventForm
            {...props}
            errorMessage="Nejdřív si ověř e-mail."
          />
        </QueryClientProvider>,
      )

      const alert = screen.getByRole("alert")
      expect(alert).toHaveTextContent("Nejdřív si ověř e-mail.")
      expect(scrollIntoView).toHaveBeenCalledOnce()
      expect(scrollIntoView.mock.contexts[0]).toBe(alert)
    })
  })

  it("min 0, max below min and a date in the past can't be saved", async () => {
    const { onSubmit } = renderForm({
      initialValues: { startsAt: new Date(Date.now() - 86_400_000).toISOString() },
    })

    await userEvent.type(screen.getByLabelText("Minimum"), "0")
    await userEvent.type(screen.getByLabelText("Maximum"), "0")
    await submit()
    expect(await screen.findByText("Minimum musí být aspoň 1")).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText("Minimum"))
    await userEvent.type(screen.getByLabelText("Minimum"), "6")
    await userEvent.clear(screen.getByLabelText("Maximum"))
    await userEvent.type(screen.getByLabelText("Maximum"), "4")
    await submit()

    expect(await screen.findByText("Maximum nesmí být menší než minimum")).toBeInTheDocument()
    expect(screen.getByText("Termín musí být v budoucnosti")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the event: numbers, the place from the map, the start and the end as instants", async () => {
    const start = new Date(Date.now() + 3 * 86_400_000)
    start.setSeconds(0, 0)
    const [day = "", time = ""] = toPragueWallTime(start).split("T")
    // the day comes from the calendar; here it is prefilled
    const { onSubmit } = renderForm({
      initialValues: {
        activityId: "a-deskove-hry",
        localityId: "l-praha-8",
        startsAt: start.toISOString(),
      },
    })

    await userEvent.type(screen.getByLabelText("Název akce *"), "Deskovky po práci")
    // the map looks at the chosen locality; its middle is the place
    await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
    await userEvent.type(screen.getByLabelText("Adresa *"), "Herna Karlín, Křižíkova 52, Praha 8")
    expect(screen.getByRole("button", { name: /Datum/ })).toHaveTextContent(/\d+\.\s\d+\.\s\d{4}/)
    await userEvent.type(screen.getByLabelText("Konec"), "23:45")
    await userEvent.type(screen.getByLabelText("Minimum"), "3")
    await userEvent.type(screen.getByLabelText("Maximum"), "6")
    await userEvent.click(screen.getByRole("radio", { name: /Schvaluji přihlášky/ }))
    await submit()

    expect(onSubmit).toHaveBeenCalledOnce()
    const input = onSubmit.mock.calls[0]![0] as Record<string, unknown>
    expect(input).toMatchObject({
      title: "Deskovky po práci",
      description: null,
      activityId: "a-deskove-hry",
      localityId: "l-praha-8",
      address: "Herna Karlín, Křižíkova 52, Praha 8",
      startsAt: start.toISOString(),
      endsAt: eventTimes(day, time, "23:45").endsAt!.toISOString(),
      minParticipants: 3,
      maxParticipants: 6,
      approvalMode: "approval",
      // an event with approval e-mails every request anyway (#86)
      emailOnJoin: false,
    })
    expect(input.lat).toBeCloseTo(50.11, 3)
    expect(input.lng).toBeCloseTo(14.47, 3)
  })

  it("athletics races in Ústí nad Orlicí (PO): activity and town are typed, the map moves there", async () => {
    const { onSubmit } = renderForm({
      initialValues: { startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString() },
    })

    await pick("Aktivita *", "Hledat aktivitu", "zavody")
    expect(screen.getByRole("combobox", { name: "Aktivita *" })).toHaveTextContent(
      "Pohyb a tanec › Atletika",
    )
    await pick("Lokalita *", "Hledat lokalitu", "usti nad orl")
    expect(screen.getByRole("combobox", { name: "Lokalita *" })).toHaveTextContent(
      "Ústí nad Orlicí",
    )
    await userEvent.type(screen.getByLabelText("Název akce *"), "Atletické závody")
    // the map looks at the chosen town; its middle is the place
    await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
    await userEvent.type(screen.getByLabelText("Adresa *"), "Městský stadion")
    await userEvent.type(screen.getByLabelText("Minimum"), "6")
    await userEvent.type(screen.getByLabelText("Maximum"), "30")
    await submit()

    expect(onSubmit).toHaveBeenCalledOnce()
    const input = onSubmit.mock.calls[0]![0] as Record<string, unknown>
    expect(input).toMatchObject({ activityId: "a-atletika", localityId: "l-usti-nad-orlici" })
    expect(input.lat).toBeCloseTo(49.9739, 3)
    expect(input.lng).toBeCloseTo(16.3936, 3)
  })

  it("an end equal to the start is refused; the end is optional", async () => {
    const start = new Date(Date.now() + 2 * 86_400_000)
    const [, time = ""] = toPragueWallTime(start).split("T")
    renderForm({ initialValues: { startsAt: start.toISOString() } })

    expect(screen.getByText("Nepovinné")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Konec"), time)
    await submit()

    expect(await screen.findByText("Konec musí být jiný než začátek")).toBeInTheDocument()
  })

  it("the description says what makes an event worth joining (level, price, gear aren't fields)", () => {
    renderForm()

    expect(screen.getByLabelText("Popis")).toHaveAccessibleDescription(
      "Napiš, pro koho akce je, jaká úroveň stačí, kolik stojí a co si vzít s sebou.",
    )
  })

  it("shows the server's answer and disables the button while saving", () => {
    renderForm({ errorMessage: "Nejdřív si ověř e-mail.", isSubmitting: true })

    expect(screen.getByText("Nejdřív si ověř e-mail.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zveřejnit akci" })).toBeDisabled()
  })

  describe("address suggestions (#40)", () => {
    const inThreeDays = () => {
      const start = new Date(Date.now() + 3 * 86_400_000)
      start.setSeconds(0, 0)
      return start.toISOString()
    }
    const fillTheRest = async () => {
      await userEvent.type(screen.getByLabelText("Název akce *"), "Deskovky po práci")
      await userEvent.type(screen.getByLabelText("Minimum"), "3")
      await userEvent.type(screen.getByLabelText("Maximum"), "6")
    }
    const addressField = () => screen.getByRole("combobox", { name: "Adresa *" })

    it("suggests real addresses near the chosen locality; a pick fills in the address and moves the pin", async () => {
      const fetchMock = answerAddresses(letenska, krizikova)
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          startsAt: inThreeDays(),
        },
      })

      await userEvent.type(addressField(), "Letenská 15")
      const option = await screen.findByRole("option", { name: /Letenská 525\/15/ })
      expect(screen.getByRole("listbox", { name: "Návrhy adres" })).toBeInTheDocument()
      expect(screen.getByText("Adresy z OpenStreetMap")).toBeInTheDocument()
      // one request once the typing stops, near the middle of Praha 8
      expect(fetchMock).toHaveBeenCalledOnce()
      const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]))
      expect(url.searchParams.get("q")).toBe("Letenská 15")
      expect(url.searchParams.get("lat")).toBe("50.1100")
      expect(url.searchParams.get("lon")).toBe("14.4700")

      await userEvent.click(option)

      expect(addressField()).toHaveValue("Letenská 525/15, Praha – Malá Strana")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      await fillTheRest()
      await submit()

      expect(onSubmit).toHaveBeenCalledOnce()
      const input = onSubmit.mock.calls[0]![0] as Record<string, unknown>
      expect(input).toMatchObject({
        address: "Letenská 525/15, Praha – Malá Strana",
        lat: 50.0891477,
        lng: 14.4072071,
        // OpenStreetMap only says „Praha“; don't retain an unrelated district.
        localityId: "l-praha",
      })
    })

    it("an address in a Prague district sets that district as the locality", async () => {
      answerAddresses(krizikova)
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha",
          startsAt: inThreeDays(),
        },
      })

      await userEvent.type(addressField(), "Křižíkova 52")
      await userEvent.click(await screen.findByRole("option", { name: /Křižíkova 53\/52/ }))
      await fillTheRest()
      await submit()

      expect(onSubmit).toHaveBeenCalledOnce()
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({
        address: "Křižíkova 53/52, Praha 8 – Karlín",
        localityId: "l-praha-8",
      })
    })

    it("an address in Prague 9 replaces a previously selected town", async () => {
      answerAddresses({
        type: "Feature",
        geometry: { type: "Point", coordinates: [14.4889715, 50.1224138] },
        properties: {
          type: "street",
          osm_key: "highway",
          countrycode: "CZ",
          name: "Bílinská",
          district: "Praha 9",
          locality: "Střížkov",
          city: "Praha",
        },
      })
      renderForm({ initialValues: { localityId: "l-usti-nad-orlici" } })
      await userEvent.type(addressField(), "Bílinská")
      await userEvent.click(await screen.findByRole("option", { name: /Bílinská.*Praha 9/ }))
      expect(screen.getByRole("combobox", { name: "Lokalita *" })).toHaveTextContent("Praha 9")
    })

    it("an address in another town of the catalog sets that town (Ústí nad Orlicí)", async () => {
      answerAddresses({
        type: "Feature",
        geometry: { type: "Point", coordinates: [16.3893, 49.9702] },
        properties: {
          type: "house",
          osm_key: "place",
          countrycode: "CZ",
          housenumber: "1330",
          street: "Lázeňská",
          city: "Ústí nad Orlicí",
          county: "okres Ústí nad Orlicí",
        },
      })
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-atletika",
          localityId: "l-praha",
          startsAt: inThreeDays(),
        },
      })

      await userEvent.type(addressField(), "Lázeňská 1330")
      await userEvent.click(await screen.findByRole("option", { name: /Lázeňská 1330/ }))
      expect(screen.getByRole("combobox", { name: "Lokalita *" })).toHaveTextContent(
        "Ústí nad Orlicí",
      )
      await fillTheRest()
      await submit()

      expect(onSubmit).toHaveBeenCalledOnce()
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({
        address: "Lázeňská 1330, Ústí nad Orlicí",
        localityId: "l-usti-nad-orlici",
        lat: 49.9702,
        lng: 16.3893,
      })
    })

    it("from the keyboard: Esc closes the list, arrows move in it, Enter picks", async () => {
      answerAddresses(letenska, krizikova)
      renderForm()

      await userEvent.type(addressField(), "Letenská 15")
      await screen.findByRole("listbox", { name: "Návrhy adres" })
      expect(addressField()).toHaveAttribute("aria-expanded", "true")
      // nothing is picked until the user moves into the list
      expect(screen.getByRole("option", { name: /Letenská/ })).toHaveAttribute(
        "aria-selected",
        "false",
      )

      await userEvent.keyboard("{Escape}")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      expect(addressField()).toHaveAttribute("aria-expanded", "false")
      expect(addressField()).toHaveValue("Letenská 15")

      await userEvent.keyboard("{ArrowDown}")
      await screen.findByRole("listbox", { name: "Návrhy adres" })
      await userEvent.keyboard("{ArrowDown}{ArrowDown}")
      const krizikovaOption = screen.getByRole("option", { name: /Křižíkova/ })
      expect(krizikovaOption).toHaveAttribute("aria-selected", "true")
      expect(addressField()).toHaveAttribute("aria-activedescendant", krizikovaOption.id)

      await userEvent.keyboard("{Enter}")
      expect(addressField()).toHaveValue("Křižíkova 53/52, Praha 8 – Karlín")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("Enter with nothing highlighted sends the form, as in any text field", async () => {
      answerAddresses(letenska)
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          startsAt: inThreeDays(),
        },
      })
      await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
      await fillTheRest()

      await userEvent.type(addressField(), "Letenská 15")
      await screen.findByRole("listbox", { name: "Návrhy adres" })
      await userEvent.keyboard("{Enter}")

      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ address: "Letenská 15" })
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it.each([
      ["offline", () => Promise.reject(new TypeError("Failed to fetch"))],
      ["the service is down", () => Promise.resolve(new Response("", { status: 503 }))],
    ])("%s: the user can enter an address after placing the pin", async (_, answer) => {
      const fetchMock = vi.fn(answer)
      vi.stubGlobal("fetch", fetchMock)
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          startsAt: inThreeDays(),
        },
      })

      await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(await screen.findByText(/Adresu se nepodařilo určit/)).toBeInTheDocument()
      await userEvent.clear(addressField())
      await userEvent.type(addressField(), "Hřiště u školy, Praha 8")
      await fillTheRest()
      await submit()

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      expect(screen.queryByText("Adresy z OpenStreetMap")).not.toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(onSubmit).toHaveBeenCalledOnce()
      const input = onSubmit.mock.calls[0]![0] as Record<string, unknown>
      expect(input).toMatchObject({ address: "Hřiště u školy, Praha 8" })
      expect(input.lat).toBeCloseTo(50.11, 3)
      expect(input.lng).toBeCloseTo(14.47, 3)
    })

    it("the organizer's own text needs no suggestion: it is sent as typed, the pin stays put", async () => {
      answerAddresses(letenska)
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          startsAt: inThreeDays(),
        },
      })

      await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
      await userEvent.type(addressField(), "Letenská 15, dvorek za domem")
      await screen.findByRole("option", { name: /Letenská 525\/15/ })
      // moving on leaves the suggestions unpicked
      await userEvent.tab()
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      await fillTheRest()
      await submit()

      expect(onSubmit).toHaveBeenCalledOnce()
      const input = onSubmit.mock.calls[0]![0] as Record<string, unknown>
      expect(input).toMatchObject({ address: "Letenská 15, dvorek za domem" })
      expect(input.lat).toBeCloseTo(50.11, 3)
      expect(input.lng).toBeCloseTo(14.47, 3)
    })
  })

  describe("a group's event (#70, Figma D-01g)", () => {
    const group = { id: "g-deskovky", name: "Deskovkáři Karlín" }

    it("names the group as the organizer and locks the activity to the group's", () => {
      renderForm({ group, initialValues: { activityId: "a-deskove-hry" } })

      expect(screen.getByText("Deskovkáři Karlín (skupina)")).toBeInTheDocument()
      expect(screen.getByRole("combobox", { name: "Aktivita *" })).toBeDisabled()
      expect(screen.getByText("Aktivita je podle skupiny a změnit nejde.")).toBeInTheDocument()
    })

    it("asks who sees it, public by default", () => {
      renderForm({ group })

      expect(screen.getByRole("radiogroup", { name: "Kdo akci uvidí *" })).toBeInTheDocument()
      expect(screen.getByRole("radio", { name: /Veřejná/ })).toBeChecked()
    })

    it("sends the group and the visibility", async () => {
      const start = new Date(Date.now() + 3 * 86_400_000)
      start.setSeconds(0, 0)
      const { onSubmit } = renderForm({
        group,
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          startsAt: start.toISOString(),
        },
      })

      await userEvent.type(screen.getByLabelText("Název akce *"), "Středeční deskovky")
      await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
      await userEvent.type(screen.getByLabelText("Adresa *"), "Herna Karlín, Křižíkova 52, Praha 8")
      await userEvent.type(screen.getByLabelText("Minimum"), "3")
      await userEvent.type(screen.getByLabelText("Maximum"), "6")
      await userEvent.click(screen.getByRole("radio", { name: /Jen pro členy skupiny/ }))
      await submit()

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: "a-deskove-hry",
          groupId: "g-deskovky",
          visibility: "members",
        }),
        { kind: "keep" },
      )
    })

    it("a person's own event doesn't ask who sees it", () => {
      renderForm()

      expect(screen.queryByRole("radiogroup", { name: "Kdo akci uvidí *" })).not.toBeInTheDocument()
    })
  })

  describe("editing (#41)", () => {
    const existing = {
      title: "Deskovky po práci",
      description: "Hry půjčíme.",
      activityId: "a-deskove-hry",
      localityId: "l-praha-8",
      lat: 50.11,
      lng: 14.47,
      address: "Herna Karlín, Křižíkova 52, Praha 8",
      startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      minParticipants: 3,
      maxParticipants: 6,
      approvalMode: "approval" as const,
    }

    it("keeps the activity and the way of joining, and saves instead of publishing", () => {
      renderForm({ mode: "edit", initialValues: existing, approvedCount: 4 })

      expect(screen.getByRole("combobox", { name: "Aktivita *" })).toBeDisabled()
      expect(screen.getByRole("radio", { name: /Schvaluji přihlášky/ })).toBeDisabled()
      const card = screen.getByRole("radio", { name: /Schvaluji přihlášky/ }).closest("label")
      expect(card).toHaveClass("cursor-not-allowed")
      expect(card).not.toHaveClass("hover:bg-accent")
      expect(card).not.toHaveClass("cursor-pointer")
      // each disabled control says why, right under it
      expect(screen.getByText("Aktivitu po založení změnit nejde.")).toBeInTheDocument()
      expect(screen.getByText("Způsob přihlašování po založení změnit nejde.")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Uložit změny" })).toBeInTheDocument()
    })

    it("the maximum can't go below the people already in; the form says why", async () => {
      const { onSubmit } = renderForm({ mode: "edit", initialValues: existing, approvedCount: 4 })

      await userEvent.clear(screen.getByLabelText("Maximum"))
      await userEvent.type(screen.getByLabelText("Maximum"), "3")
      await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))

      expect(
        await screen.findByText("Maximum nejde snížit pod počet přihlášených (4)"),
      ).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("saves the changed values", async () => {
      const { onSubmit } = renderForm({ mode: "edit", initialValues: existing, approvedCount: 4 })

      await userEvent.clear(screen.getByLabelText("Název akce *"))
      await userEvent.type(screen.getByLabelText("Název akce *"), "Deskovky ve středu")
      await userEvent.clear(screen.getByLabelText("Maximum"))
      await userEvent.type(screen.getByLabelText("Maximum"), "8")
      await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Deskovky ve středu",
          maxParticipants: 8,
          minParticipants: 3,
        }),
        { kind: "keep" },
      )
    })
  })

  describe("the event's own image (#77)", () => {
    const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!
    const pickFile = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } })
    const png = () =>
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "plakat.png", {
        type: "image/png",
      })
    const existing = {
      title: "Deskovky po práci",
      activityId: "a-deskove-hry",
      localityId: "l-praha-8",
      lat: 50.11,
      lng: 14.47,
      address: "Herna Karlín, Křižíkova 52, Praha 8",
      startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      minParticipants: 3,
      maxParticipants: 6,
      approvalMode: "open" as const,
    }
    const save = () => userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => "blob:nahled")
      URL.revokeObjectURL = vi.fn()
    })

    it("is optional: without one the activity's photo shows, and the form says so", () => {
      renderForm()

      // the button's own text first, then the field's label (WCAG 2.5.3)
      expect(
        screen.getByRole("button", { name: "Přidat plakát nebo fotku Plakát nebo fotka" }),
      ).toHaveTextContent("Přidat plakát nebo fotku")
      expect(screen.getByText(/Bez vlastního obrázku se u akce ukáže fotka aktivity/)).toBeVisible()
      expect(fileInput()).toHaveAttribute("accept", "image/jpeg,image/png,image/webp")
      // not sr-only: the kit's w-full made it as wide as the page, which then scrolled sideways
      expect(fileInput()).toHaveClass("hidden")
    })

    it("a picked image shows as a preview and goes with the form", async () => {
      const { onSubmit } = renderForm({ mode: "edit", initialValues: existing })
      const file = png()

      pickFile(file)

      const replace = await screen.findByRole("button", {
        name: "Vyměnit obrázek Plakát nebo fotka",
      })
      // the add button is gone: the keyboard stays in the field, on the one in its place
      await waitFor(() => expect(replace).toHaveFocus())
      expect(document.querySelector('img[src="blob:nahled"]')).toBeInTheDocument()
      await save()
      expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { kind: "set", file })
    })

    it.each([
      [
        "a GIF",
        new File(["GIF89a"], "animace.gif", { type: "image/gif" }),
        "Tenhle soubor nejde použít. Nahraj obrázek ve formátu JPEG, PNG nebo WebP.",
      ],
      [
        "an image over 5 MB",
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "velka.jpg", { type: "image/jpeg" }),
        "Obrázek je moc velký. Nahraj nejvýš 5 MB.",
      ],
    ])("refuses %s and says why, keeping what it had", async (_name, file, message) => {
      const { onSubmit } = renderForm({ mode: "edit", initialValues: existing })

      pickFile(file)

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Přidat plakát nebo fotku Plakát nebo fotka" }),
      ).toHaveAttribute("aria-invalid", "true")
      expect(screen.queryByRole("button", { name: /Vyměnit obrázek/ })).not.toBeInTheDocument()
      await save()
      expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { kind: "keep" })
    })

    it("editing shows the uploaded image; „Odebrat“ removes it and focus stays in the field", async () => {
      const { onSubmit } = renderForm({
        mode: "edit",
        initialValues: existing,
        initialImageSrc: "http://api.test/images/k1",
      })
      expect(document.querySelector('img[src="http://api.test/images/k1"]')).toBeVisible()

      await userEvent.click(screen.getByRole("button", { name: "Odebrat Plakát nebo fotka" }))

      const add = screen.getByRole("button", { name: "Přidat plakát nebo fotku Plakát nebo fotka" })
      expect(add).toHaveTextContent("Přidat plakát nebo fotku")
      await waitFor(() => expect(add).toHaveFocus())
      await save()
      expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { kind: "remove" })
    })

    it("editing without touching the image keeps it", async () => {
      const { onSubmit } = renderForm({
        mode: "edit",
        initialValues: existing,
        initialImageSrc: "http://api.test/images/k1",
      })

      await save()

      expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { kind: "keep" })
    })
  })
})
