import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

// #298, DESIGN.md › Accessibility (WAI-ARIA tabs): a panel with a control is no Tab stop of its
// own, so Tab goes from the tab to that control; a panel with only text stays one.
describe("TabsContent", () => {
  it("with a control in it, is no Tab stop of its own", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Přihlášen</TabsTrigger>
        </TabsList>
        <TabsContent value="a">
          <button type="button">První akce</button>
        </TabsContent>
      </Tabs>,
    )

    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1")
    await userEvent.tab()
    expect(screen.getByRole("tab", { name: "Přihlášen" })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "První akce" })).toHaveFocus()
  })

  it("with only text in it, is a Tab stop, so the keyboard reaches it", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Žádosti</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Zatím žádné žádosti.</TabsContent>
      </Tabs>,
    )

    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole("tabpanel")).toHaveFocus()
  })

  it("becomes a Tab stop when its controls go away", async () => {
    const { rerender } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Moje</TabsTrigger>
        </TabsList>
        <TabsContent value="a">
          <a href="/skupiny/1">Běžci</a>
        </TabsContent>
      </Tabs>,
    )
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1")

    rerender(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Moje</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Zatím nejsi v žádné skupině.</TabsContent>
      </Tabs>,
    )
    await waitFor(() => expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0"))
  })
})
