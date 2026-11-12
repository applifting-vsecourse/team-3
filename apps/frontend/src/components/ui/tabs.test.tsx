import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

// #298, DESIGN.md › Accessibility: Radix makes a tab panel focusable, and it has no ring — the
// kit takes it out of the Tab order on every page, so Tab goes from the tab to the panel's content.
describe("TabsContent", () => {
  it("is no Tab stop of its own", async () => {
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
})
