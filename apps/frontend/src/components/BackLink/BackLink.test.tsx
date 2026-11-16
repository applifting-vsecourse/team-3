import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { BackLink } from "./BackLink"
import { backLabel, forgetHistory, rememberHistoryEntry } from "./backTarget"

const back = (
  <BackLink
    to="/akce"
    fallbackLabel="Všechny akce"
    label="Akce"
  />
)

describe("BackLink (N9, #187)", () => {
  afterEach(forgetHistory)

  it("is named after the page it returns to — Moje akce, not a fixed „Akce“", async () => {
    rememberHistoryEntry(0, "/moje/akce")
    await renderWithRouter(back, { url: "/akce/e1", previous: ["/moje/akce"] })

    expect(screen.getByRole("link", { name: "Moje akce" })).toBeInTheDocument()
  })

  it("says „Zpět“ where the page it returns to isn't known (after a reload)", async () => {
    await renderWithRouter(back, { url: "/akce/e1", previous: ["/moje/akce"] })

    expect(screen.getByRole("link", { name: "Zpět" })).toBeInTheDocument()
  })

  it("without history (a shared link) leads to `to`, named by `label`", async () => {
    await renderWithRouter(back, { url: "/akce/e1" })

    expect(screen.getByRole("link", { name: "Akce" })).toHaveAttribute("href", "/akce")
  })
})

describe("backLabel", () => {
  it.each([
    ["/", "Úvod"],
    ["/akce", "Akce"],
    ["/moje/akce", "Moje akce"],
    ["/moje/skupiny", "Moje skupiny"],
    ["/skupiny", "Skupiny"],
    ["/skupiny/g1", "Skupina"],
    ["/akce/e1", "Detail akce"],
    ["/akce/e1/sprava", "Správa akce"],
    ["/skupiny/g1/sprava", "Správa skupiny"],
    ["/profil", "Profil"],
  ])("%s → „%s“", (pathname, label) => {
    expect(backLabel(pathname)).toBe(label)
  })

  it("a form or an unknown page says „Zpět“ instead", () => {
    expect(backLabel("/akce/nova")).toBeUndefined()
    expect(backLabel("/skupiny/nova")).toBeUndefined()
    expect(backLabel("/akce/e1/upravit")).toBeUndefined()
    expect(backLabel(undefined)).toBeUndefined()
  })
})
