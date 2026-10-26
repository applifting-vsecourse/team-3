import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Catalog } from "@/lib/catalog/catalogSearch"

import { EventForm } from "@/features/events/components/EventForm"
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
      id: "l-usti-nad-orlici",
      slug: "usti-nad-orlici",
      name: "Ústí nad Orlicí",
      parentId: null,
      lat: 49.9739,
      lng: 16.3936,
    },
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
  // no test talks to the real address service
  answerAddresses()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("EventForm", () => {
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

  it("ties the place's error to the map", async () => {
    renderForm()

    await submit()

    const map = screen.getByRole("region", { name: "Místo na mapě *" })
    expect(map).toHaveAccessibleDescription("Vyber místo na mapě")
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
        // OpenStreetMap only says „Praha“ here: the chosen district stays
        localityId: "l-praha-8",
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
    ])("%s: no suggestions, no extra message, and the typed address is sent", async (_, answer) => {
      const fetchMock = vi.fn(answer)
      vi.stubGlobal("fetch", fetchMock)
      const { onSubmit } = renderForm({
        initialValues: {
          activityId: "a-deskove-hry",
          localityId: "l-praha-8",
          startsAt: inThreeDays(),
        },
      })

      await userEvent.type(addressField(), "Hřiště u školy, Praha 8")
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))
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
      )
    })
  })
})
