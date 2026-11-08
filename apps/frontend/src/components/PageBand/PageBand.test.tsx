import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Tabs } from "@/components/ui/tabs"
import { renderWithRouter } from "@/test/renderWithRouter"

import { BandTabs, BandTabsItem } from "./BandTabs"
import { PageBand } from "./PageBand"

describe("PageBand", () => {
  it("holds the page's one heading and its supporting line", async () => {
    await renderWithRouter(
      <PageBand
        variant="section"
        title="Moje akce"
        description="Akce, kam jdeš."
      />,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Moje akce" })).toBeInTheDocument()
    expect(screen.getByText("Akce, kam jdeš.")).toBeInTheDocument()
  })

  it("a page under a section leads back", async () => {
    await renderWithRouter(
      <PageBand
        title="Nová akce"
        back={{ to: "/moje-akce", fallbackLabel: "Moje akce", label: "Moje akce" }}
        isCompactOnMobile
      />,
    )

    // the label stays the link's name even where a phone shows only the arrow
    expect(screen.getByRole("link", { name: "Moje akce" })).toHaveAttribute("href", "/moje-akce")
  })

  it("the logo motif is decoration", async () => {
    const { container } = await renderWithRouter(
      <PageBand
        variant="section"
        title="Skupiny"
      />,
    )

    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.closest("[aria-hidden='true']")).not.toBeNull()
    }
  })
})

describe("BandTabs", () => {
  it("shows the count once it is known", async () => {
    await renderWithRouter(
      <Tabs value="vsechny">
        <BandTabs>
          <BandTabsItem value="vsechny">Všechny</BandTabsItem>
          <BandTabsItem
            value="moje"
            count={3}
          >
            Moje
          </BandTabsItem>
        </BandTabs>
      </Tabs>,
    )

    expect(screen.getByRole("tab", { name: "Všechny" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Moje 3" })).toBeInTheDocument()
  })

  it("the landing page's band holds its panel beside the title (Figma A-01d)", async () => {
    await renderWithRouter(
      <PageBand
        variant="hero"
        title="Někde chybí jeden do party."
        aside={<article aria-label="Teď chybí jeden" />}
      >
        <a href="/akce">Prohlédnout akce</a>
      </PageBand>,
    )

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("article", { name: "Teď chybí jeden" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Prohlédnout akce" })).toBeInTheDocument()
  })

  it("quick picks on the page's background mark the active one like on the band", async () => {
    await renderWithRouter(
      <Tabs defaultValue="chybi">
        <BandTabs>
          <BandTabsItem
            value="chybi"
            count={3}
            surface="page"
          >
            Tady chybíš
          </BandTabsItem>
          <BandTabsItem
            value="vikend"
            count={2}
            surface="page"
          >
            Tento víkend
          </BandTabsItem>
        </BandTabs>
      </Tabs>,
    )

    expect(screen.getByRole("tab", { name: "Tady chybíš 3" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "Tento víkend 2" })).toHaveClass("text-muted-foreground")
  })
})
