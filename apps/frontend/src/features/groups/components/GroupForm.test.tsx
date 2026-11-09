import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Catalog } from "@/lib/catalog/catalogSearch"

import type { GroupInput } from "@/features/groups/api/groupSchemas"
import { GroupForm } from "@/features/groups/components/GroupForm"

const catalog: Catalog = {
  localities: [
    { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 },
    { id: "l-praha-7", slug: "praha-7", name: "Praha 7", parentId: "l-praha", lat: 50, lng: 14 },
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

const existing: GroupInput = {
  name: "Deskovky Holešovice",
  description: "Pravidelné deskovky.",
  activityId: "a-deskove-hry",
  localityId: "l-praha-7",
  type: "closed",
}

const renderForm = (props: Partial<Parameters<typeof GroupForm>[0]> = {}) => {
  const onSubmit = vi.fn()
  render(
    // Lokalita also searches places online (OpenStreetMap)
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <GroupForm
        catalog={catalog}
        submitLabel="Založit skupinu"
        isSubmitting={false}
        onSubmit={onSubmit}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onSubmit }
}

beforeEach(() => {
  // no test talks to the real place search
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json({ type: "FeatureCollection", features: [] }))),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GroupForm", () => {
  it("an untouched form can be sent and says what is missing", async () => {
    const { onSubmit } = renderForm()

    const submit = screen.getByRole("button", { name: "Založit skupinu" })
    expect(submit).toBeEnabled()
    await userEvent.click(submit)

    expect(await screen.findByText("Vyplň název skupiny")).toBeInTheDocument()
    expect(screen.getByText("Skupina potřebuje právě jednu aktivitu")).toBeInTheDocument()
    expect(screen.getByText("Skupina potřebuje právě jednu lokalitu")).toBeInTheDocument()
    // the type is preselected, so it has nothing to say
    expect(screen.queryByText("Vyber typ skupiny")).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("founding: the group is public unless the founder picks otherwise (#190)", () => {
    renderForm()

    expect(screen.getByRole("radio", { name: /^Veřejná/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Neveřejná/ })).not.toBeChecked()
  })

  it("a failed submit scrolls to the first invalid field and focuses it (#190)", async () => {
    renderForm()
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView").mockClear()

    await userEvent.click(screen.getByRole("button", { name: "Založit skupinu" }))

    const name = screen.getByLabelText("Název skupiny *")
    await waitFor(() => expect(name).toHaveFocus())
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView.mock.contexts[0]).toBe(name)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("a valid name moves the focus on to the next invalid field, the activity", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("Název skupiny *"), "Deskovky Letná")
    await userEvent.click(screen.getByRole("button", { name: "Založit skupinu" }))

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Aktivita *" })).toHaveFocus())
  })

  it("with reduced motion it jumps to the field instead of scrolling smoothly", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    renderForm()
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView").mockClear()

    await userEvent.click(screen.getByRole("button", { name: "Založit skupinu" }))

    await waitFor(() => expect(screen.getByLabelText("Název skupiny *")).toHaveFocus())
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" })
  })

  it("founding: the activity and the locality are found by typing", async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(screen.getByLabelText("Název skupiny *"), "Deskovky Letná")
    await userEvent.click(screen.getByRole("combobox", { name: "Aktivita *" }))
    await userEvent.type(screen.getByRole("combobox", { name: "Hledat aktivitu" }), "deskov")
    await userEvent.keyboard("{Enter}")
    await userEvent.click(screen.getByRole("combobox", { name: "Lokalita *" }))
    await userEvent.type(screen.getByRole("combobox", { name: "Hledat lokalitu" }), "praha 7")
    await userEvent.keyboard("{Enter}")
    // the type is left as preselected
    await userEvent.click(screen.getByRole("button", { name: "Založit skupinu" }))

    expect(screen.getByRole("combobox", { name: "Aktivita *" })).toHaveTextContent(
      "Hry › Deskové hry",
    )
    expect(screen.getByRole("combobox", { name: "Lokalita *" })).toHaveTextContent("Praha 7")
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Deskovky Letná",
      description: null,
      activityId: "a-deskove-hry",
      localityId: "l-praha-7",
      type: "public",
    })
  })

  it("editing starts from the group's values and sends every field", async () => {
    const { onSubmit } = renderForm({ initialValues: existing, submitLabel: "Uložit změny" })

    expect(screen.getByLabelText("Název skupiny *")).toHaveValue("Deskovky Holešovice")
    expect(screen.getByText("Hry › Deskové hry")).toBeInTheDocument()
    // a non-public group stays non-public, the preselection is only for founding
    expect(screen.getByRole("radio", { name: /Neveřejná/ })).toBeChecked()
    expect(screen.getByRole("radio", { name: /^Veřejná/ })).not.toBeChecked()

    await userEvent.clear(screen.getByLabelText("Název skupiny *"))
    await userEvent.type(screen.getByLabelText("Název skupiny *"), "  Deskovky Letná ")
    await userEvent.click(screen.getByRole("radio", { name: /Veřejná/ }))
    await userEvent.clear(screen.getByLabelText("Popis"))
    await userEvent.click(screen.getByRole("button", { name: "Uložit změny" }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Deskovky Letná",
      // an emptied description is no description
      description: null,
      activityId: "a-deskove-hry",
      localityId: "l-praha-7",
      type: "public",
    })
  })

  it("a name over 80 characters is caught before the server", async () => {
    const { onSubmit } = renderForm({ initialValues: { ...existing, name: "x".repeat(81) } })

    await userEvent.click(screen.getByRole("button", { name: "Založit skupinu" }))

    expect(await screen.findByText("Název může mít nejvýš 80 znaků")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows the server's error and a pending submit", () => {
    renderForm({ isSubmitting: true, errorMessage: "Neznámá aktivita" })

    expect(screen.getByText("Neznámá aktivita")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Založit skupinu" })).toBeDisabled()
  })
})
