import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

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
  ],
  categories: [
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
    <EventForm
      catalog={catalog}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit }
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Zveřejnit akci" }))

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
