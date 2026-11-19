import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { stubResizableWindow } from "@/test/stubResizableWindow"

import { ManagementTabs } from "./ManagementTabs"

/** Stands in for an open dialog: state that a remount would lose. */
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button
      type="button"
      onClick={() => setCount((n) => n + 1)}
    >
      Kliknuto {count}×
    </button>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ManagementTabs (#371, #316)", () => {
  it("keeps every panel mounted, the inactive one hidden on a phone by CSS alone", () => {
    render(
      <ManagementTabs
        tabs={[
          { value: "requests", label: "Žádosti (2)", content: <p>Seznam žádostí</p> },
          { value: "participants", label: "Účastníci (4)", content: <p>Seznam účastníků</p> },
        ]}
      />,
    )

    expect(screen.getByText("Seznam žádostí")).toBeInTheDocument()
    const inactive = screen.getByText("Seznam účastníků").closest("[role=tabpanel]")
    expect(inactive).not.toHaveAttribute("hidden")
    expect(inactive).toHaveClass("data-[state=inactive]:max-md:hidden")
  })

  it("loses no state when the window crosses 768 px, both ways", async () => {
    const resize = stubResizableWindow(false)
    render(
      <ManagementTabs
        tabs={[
          { value: "requests", label: "Žádosti (1)", content: <Counter /> },
          { value: "participants", label: "Účastníci (0)", content: <p>Nikdo</p> },
        ]}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Kliknuto 0×" }))
    resize(true)
    expect(screen.getByRole("button", { name: "Kliknuto 1×" })).toBeInTheDocument()
    resize(false)
    expect(screen.getByRole("button", { name: "Kliknuto 1×" })).toBeInTheDocument()
  })

  it("on desktop the panels are plain lists: no tab panels, no Tab stops of their own", () => {
    stubResizableWindow(true)
    render(
      <ManagementTabs
        tabs={[
          { value: "requests", label: "Žádosti (0)", content: <p>Žádné žádosti</p> },
          { value: "participants", label: "Účastníci (0)", content: <p>Nikdo</p> },
        ]}
      />,
    )

    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument()
    for (const text of ["Žádné žádosti", "Nikdo"]) {
      const panel = screen.getByText(text).closest("[data-slot=tabs-content]")
      expect(panel).toHaveAttribute("tabindex", "-1")
      expect(panel).not.toHaveAttribute("aria-labelledby")
    }
  })

  it("a hidden tab stays mounted, and one list left needs no tabs", () => {
    render(
      <ManagementTabs
        tabs={[
          {
            value: "requests",
            label: "Žádosti (0)",
            content: <p>Žádné žádosti</p>,
            isHidden: true,
          },
          { value: "members", label: "Členové (1)", content: <p>Tomáš</p> },
        ]}
      />,
    )

    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument()
    expect(screen.getByText("Tomáš")).toBeInTheDocument()
    expect(screen.getByText("Žádné žádosti").closest("[data-slot=tabs-content]")).toHaveClass(
      "hidden",
    )
  })
})
