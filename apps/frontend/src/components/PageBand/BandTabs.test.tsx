import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Tabs } from "@/components/ui/tabs"

import { BandTabs, BandTabsItem } from "./BandTabs"

describe("BandTabs", () => {
  it("sets the active tab apart by more than the underline: weight and the count pill", () => {
    render(
      <Tabs value="moje">
        <BandTabs>
          <BandTabsItem
            value="vsechny"
            count={0}
          >
            Všechny
          </BandTabsItem>
          <BandTabsItem
            value="moje"
            count={4}
          >
            Moje
          </BandTabsItem>
        </BandTabs>
      </Tabs>,
    )

    const active = screen.getByRole("tab", { name: "Moje 4" })
    const inactive = screen.getByRole("tab", { name: "Všechny 0" })
    expect(active).toHaveAttribute("data-state", "active")
    expect(active).toHaveClass(
      "data-[state=active]:border-primary",
      "data-[state=active]:font-semibold",
    )
    expect(inactive).toHaveClass("font-medium", "text-on-hero-muted")
    expect(screen.getByText("4")).toHaveClass("group-data-[state=active]/tab:text-on-hero")
  })

  it("is as tall as its tabs, so the lime underline isn't clipped", () => {
    render(
      <Tabs value="moje">
        <BandTabs>
          <BandTabsItem value="moje">Moje</BandTabsItem>
        </BandTabs>
      </Tabs>,
    )

    // the kit fixes the strip at h-9 behind a variant; a plain h-auto would not replace it
    const strip = screen.getByRole("tablist")
    expect(strip).not.toHaveClass("group-data-[orientation=horizontal]/tabs:h-9")
    expect(strip).toHaveClass("group-data-[orientation=horizontal]/tabs:h-auto")
    // sideways only, no scrollbar: the kit's indicator 5 px below the tab made it scroll
    expect(strip).toHaveClass("overflow-y-hidden", "[scrollbar-width:none]")
    expect(screen.getByRole("tab", { name: "Moje" })).toHaveClass("after:hidden")
  })
})
