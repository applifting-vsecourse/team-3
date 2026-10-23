import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListPanel } from "@/features/events/components/ListPanel"

const renderPanel = (isExpanded: boolean) => {
  const onExpandedChange = vi.fn()
  render(
    <ListPanel
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      <p data-peek-end>1 akce</p>
    </ListPanel>,
  )
  return onExpandedChange
}

// pointer events at the given Y, with time passing in between
const drag = (handle: HTMLElement, from: number, to: number, ms: number) => {
  const now = vi.spyOn(performance, "now").mockReturnValue(1000)
  fireEvent.pointerDown(handle, { clientY: from, pointerId: 1 })
  fireEvent.pointerMove(handle, { clientY: (from + to) / 2, pointerId: 1 })
  now.mockReturnValue(1000 + ms)
  fireEvent.pointerUp(handle, { clientY: to, pointerId: 1 })
  now.mockRestore()
}

describe("ListPanel", () => {
  it("is pulled up by tapping the handle", () => {
    const onExpandedChange = renderPanel(false)

    const handle = screen.getByRole("button", { name: "Vytáhnout seznam" })
    expect(handle).toHaveAttribute("aria-expanded", "false")
    drag(handle, 600, 601, 80)
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })

  it("follows a flick up and a flick down", () => {
    const onExpandedChange = renderPanel(false)
    drag(screen.getByRole("button", { name: "Vytáhnout seznam" }), 600, 500, 100)
    expect(onExpandedChange).toHaveBeenLastCalledWith(true)
  })

  it("is pulled down from the open list by the same handle", () => {
    const onExpandedChange = renderPanel(true)

    const handle = screen.getByRole("button", { name: "Stáhnout seznam" })
    expect(handle).toHaveAttribute("aria-expanded", "true")
    drag(handle, 100, 220, 100)
    expect(onExpandedChange).toHaveBeenLastCalledWith(false)
  })

  it("moves with the finger while dragging, and settles with an animation", () => {
    renderPanel(true)
    const panel = screen.getByRole("region", { name: "Seznam akcí" })
    const handle = screen.getByRole("button", { name: "Stáhnout seznam" })

    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientY: 110, pointerId: 1 })
    expect(panel.style.transform).toBe("translateY(10px)")
    // no transition while the finger drives it
    expect(panel.className).not.toContain("transition-transform")
    fireEvent.pointerUp(handle, { clientY: 110, pointerId: 1 })
    expect(panel.className).toContain("transition-transform")
  })

  it("reports how much of the closed sheet shows, so the map can keep its attribution above it", () => {
    const onPeekHeightChange = vi.fn()
    render(
      <ListPanel
        isExpanded={false}
        onExpandedChange={vi.fn()}
        onPeekHeightChange={onPeekHeightChange}
      >
        <p data-peek-end>1 akce</p>
      </ListPanel>,
    )

    expect(onPeekHeightChange).toHaveBeenCalled()
    expect(onPeekHeightChange.mock.lastCall?.[0]).toBeGreaterThanOrEqual(0)
  })

  it("works from the keyboard", async () => {
    const onExpandedChange = renderPanel(false)

    screen.getByRole("button", { name: "Vytáhnout seznam" }).focus()
    await userEvent.keyboard("{Enter}")
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })
})
