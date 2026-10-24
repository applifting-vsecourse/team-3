import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

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
    <GroupForm
      catalog={catalog}
      submitLabel="Založit skupinu"
      isSubmitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit }
}

describe("GroupForm", () => {
  it("an untouched form can be sent and says what is missing", async () => {
    const { onSubmit } = renderForm()

    const submit = screen.getByRole("button", { name: "Založit skupinu" })
    expect(submit).toBeEnabled()
    await userEvent.click(submit)

    expect(await screen.findByText("Vyplň název skupiny")).toBeInTheDocument()
    expect(screen.getByText("Skupina potřebuje právě jednu aktivitu")).toBeInTheDocument()
    expect(screen.getByText("Skupina potřebuje právě jednu lokalitu")).toBeInTheDocument()
    expect(screen.getByText("Vyber typ skupiny")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("editing starts from the group's values and sends every field", async () => {
    const { onSubmit } = renderForm({ initialValues: existing, submitLabel: "Uložit změny" })

    expect(screen.getByLabelText("Název skupiny *")).toHaveValue("Deskovky Holešovice")
    expect(screen.getByText("Hry › Deskové hry")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Neveřejná/ })).toBeChecked()

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
