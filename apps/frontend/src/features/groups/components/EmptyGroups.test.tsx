import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Catalog } from "@/lib/catalog/catalogSearch"
import { renderWithRouter } from "@/test/renderWithRouter"

import { EmptyGroups } from "./EmptyGroups"

const catalog = {
  localities: [{ id: "l-novy-bor", slug: "novy-bor", name: "Nový Bor" }],
  categories: [
    {
      id: "c-priroda",
      slug: "priroda",
      name: "Příroda",
      icon: "mountain",
      activities: [
        { id: "a-zahrada", slug: "komunitni-zahrada", name: "Komunitní zahrada", keywords: [] },
      ],
    },
  ],
} as unknown as Catalog

const search = { lokalita: "novy-bor", aktivita: "komunitni-zahrada" }

describe("EmptyGroups (Figma A-07e)", () => {
  it("names the filters and widens the search", async () => {
    const onSearchChange = vi.fn()
    await renderWithRouter(
      <EmptyGroups
        search={search}
        catalog={catalog}
        isVisitor={false}
        onSearchChange={onSearchChange}
      />,
    )

    expect(screen.getByText("Nový Bor · Komunitní zahrada")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Hledat v celém Česku" }))
    expect(onSearchChange).toHaveBeenCalledWith({ lokalita: "cele-cesko" })
    await userEvent.click(screen.getByRole("button", { name: "Zrušit typ aktivity" }))
    expect(onSearchChange).toHaveBeenCalledWith({ kategorie: undefined, aktivita: undefined })
  })

  it("founds the group with the activity and the locality filled in", async () => {
    await renderWithRouter(
      <EmptyGroups
        search={search}
        catalog={catalog}
        isVisitor={false}
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("link", { name: "Založit skupinu" })).toHaveAttribute(
      "href",
      "/skupiny/nova?aktivita=komunitni-zahrada&lokalita=novy-bor",
    )
  })

  it("a visitor signs up first and comes back to the filled-in form", async () => {
    await renderWithRouter(
      <EmptyGroups
        search={search}
        catalog={catalog}
        isVisitor
        onSearchChange={vi.fn()}
      />,
    )

    const link = screen.getByRole("link", { name: "Založit skupinu" })
    expect(new URL(link.getAttribute("href")!, "http://x").searchParams.get("from")).toBe(
      "/skupiny/nova?aktivita=komunitni-zahrada&lokalita=novy-bor",
    )
  })

  it("the whole country and no activity: only founding is left", async () => {
    await renderWithRouter(
      <EmptyGroups
        search={{ lokalita: "cele-cesko" }}
        catalog={catalog}
        isVisitor={false}
        onSearchChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Založit skupinu" })).toBeInTheDocument()
  })
})
