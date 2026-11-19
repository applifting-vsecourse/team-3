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
        back={{ to: "/moje/akce", fallbackLabel: "Moje akce", label: "Moje akce" }}
        isCompactOnMobile
      />,
    )

    // the label stays the link's name even where a phone shows only the arrow
    expect(screen.getByRole("link", { name: "Moje akce" })).toHaveAttribute("href", "/moje/akce")
  })

  it("puts the leading picture before the title, outside its name (#178)", async () => {
    await renderWithRouter(
      <PageBand
        title="Jana Nová"
        leading={<span aria-hidden="true">JN</span>}
      />,
    )

    const heading = screen.getByRole("heading", { level: 1, name: "Jana Nová" })
    expect(heading.previousElementSibling).toHaveTextContent("JN")
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

  // #298: the motifs never run under the band's tabs. jsdom has no layout, so this checks the
  // motif boxes end the tab strip's height (the band-tabs token BandTabsItem is) above the band's edge.
  const motifBoxes = (container: HTMLElement) =>
    // the motifs' boxes, not the logo mark before the title
    [...container.querySelectorAll("div.absolute[aria-hidden='true']")]

  it("on /akce the big motif and the phone's corner motif end above the tabs", async () => {
    const { container } = await renderWithRouter(
      <Tabs value="vse">
        <PageBand
          variant="section"
          isMotifAboveTabs
          title="Akce"
        >
          <BandTabs>
            <BandTabsItem value="vse">Všechny akce</BandTabsItem>
          </BandTabs>
        </PageBand>
      </Tabs>,
    )

    const boxes = motifBoxes(container)
    expect(boxes).toHaveLength(2)
    for (const box of boxes) expect(box).toHaveClass("bottom-band-tabs")
  })

  it("elsewhere the big motif rises from the band's edge, so it keeps clear of the action", async () => {
    const { container } = await renderWithRouter(
      <Tabs value="poradam">
        <PageBand
          variant="section"
          title="Moje akce"
          action={<button type="button">Založit akci</button>}
        >
          <BandTabs>
            <BandTabsItem value="poradam">Pořádám</BandTabsItem>
          </BandTabs>
        </PageBand>
      </Tabs>,
    )

    const [big, corner] = motifBoxes(container)
    expect(big).toHaveClass("xl:block", "bottom-0")
    // on a phone the tabs scroll under any motif, so the corner one ends above them anyway
    expect(corner).toHaveClass("md:hidden", "bottom-band-tabs")
  })

  // review #368: an isolated band shut in Moje's floating „Založit akci“, and the cards scrolling
  // past covered it on a phone; jsdom has no layout, the overlap was checked in the browser
  it("only the landing page's band is isolated: a section's floating action stays above the cards", async () => {
    const band = (container: HTMLElement) => container.querySelector(".on-hero")!
    const section = await renderWithRouter(
      <PageBand
        variant="section"
        title="Moje"
        action={<a href="/akce/nova">Založit akci</a>}
      />,
    )
    expect(band(section.container)).not.toHaveClass("isolate")
    section.unmount()

    const hero = await renderWithRouter(
      <PageBand
        variant="hero"
        title="Někde chybí jeden do party."
      />,
    )
    expect(band(hero.container)).toHaveClass("isolate")
  })

  it("the landing page's ring hangs under its buttons, not from the band's edge (#324)", async () => {
    const { container } = await renderWithRouter(
      <PageBand
        variant="hero"
        title="Někde chybí jeden do party."
        aside={<div>Panel</div>}
      >
        <a href="/signup">Zaregistrovat se</a>
      </PageBand>,
    )

    // the panel beside the buttons sets the band's height: hung from the band's bottom, the ring
    // ran through „Zaregistrovat se“ at some widths; now it is placed against the buttons' row
    // the big motif (from lg), not the phone's corner one
    const motif = [...container.querySelectorAll("svg")].find((svg) =>
      svg.classList.contains("lg:block"),
    )!
    expect(motif.querySelector("circle.stroke-primary")).not.toBeNull()
    expect(motif.parentElement).toContainElement(
      screen.getByRole("link", { name: "Zaregistrovat se" }),
    )
    // jsdom has no layout: this only pins the placement; that the ring clears the buttons at
    // 1024–1920 px was measured by hand in the browser (PR #326)
    expect(motif).toHaveClass("top-[calc(100%-505px)]", "-z-10", "overflow-visible")
    expect(motif).not.toHaveClass("bottom-0")
    expect(motif).toHaveAttribute("aria-hidden", "true")
  })

  it("between lg and xl the landing page's motif is smaller, so it stays beside the panel", async () => {
    const { container } = await renderWithRouter(
      <PageBand
        variant="hero"
        title="Někde chybí jeden do party."
        aside={<div>Panel</div>}
      >
        <a href="/signup">Zaregistrovat se</a>
      </PageBand>,
    )
    const big = [...container.querySelectorAll("svg")].find(
      (svg) => svg.getAttribute("width") === "700",
    )!

    // jsdom has no layout, so the numbers: the drawing reaches 700 − 120 = 580 px into the
    // content; the column beside the panel is 1024 − 80 − 480 − 64 = 400 px at lg, 656 at xl
    const reach = Number(big.getAttribute("width")) - 120
    expect(reach * 0.68).toBeLessThanOrEqual(1024 - 80 - 480 - 64)
    expect(reach).toBeLessThanOrEqual(1280 - 80 - 480 - 64)
    // scaled around where the content starts at the buttons' bottom: still hung from them
    expect(big).toHaveClass(
      "lg:block",
      "scale-[0.68]",
      "xl:scale-100",
      "origin-[120px_505px]",
      "top-[calc(100%-505px)]",
      "-left-30",
    )
    // the phone's corner motif until lg: the band always has one
    expect(
      [...container.querySelectorAll("[aria-hidden=true]")].some((node) =>
        node.classList.contains("lg:hidden"),
      ),
    ).toBe(true)
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
