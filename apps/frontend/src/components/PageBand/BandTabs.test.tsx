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
})
