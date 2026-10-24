import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListPanel, type PanelSnap } from "@/features/events/components/ListPanel"

const renderPanel = (snap: PanelSnap, extra: { onVisibleHeightChange?: () => void } = {}) => {
  const onSnapChange = vi.fn()
  render(
    <ListPanel
      snap={snap}
      onSnapChange={onSnapChange}
      {...extra}
    >
      <p data-peek-min>3 akce</p>
      <p data-peek-end>První karta</p>
    </ListPanel>,
  )
  return {
    onSnapChange,
    sheet: screen.getByRole("region", { name: "Seznam akcí" }),
    card: screen.getByText("První karta"),
  }
}

// pointer events from one Y to another, taking `ms`
const swipe = (target: HTMLElement, from: number, to: number, ms: number) => {
  const now = vi.spyOn(performance, "now").mockReturnValue(1000)
  fireEvent.pointerDown(target, { clientY: from, pointerId: 1, pointerType: "touch" })
  fireEvent.pointerMove(target, { clientY: (from + to) / 2, pointerId: 1, pointerType: "touch" })
  now.mockReturnValue(1000 + ms)
  fireEvent.pointerUp(target, { clientY: to, pointerId: 1, pointerType: "touch" })
  now.mockRestore()
}

describe("ListPanel", () => {
  it("a swipe up anywhere on the lowered sheet pulls it up — no need to aim for the handle", () => {
    const { onSnapChange, card } = renderPanel("peek")
    swipe(card, 600, 500, 100)
    expect(onSnapChange).toHaveBeenLastCalledWith("list")
  })

  it("a swipe down from the peek lowers it to the map", () => {
    const { onSnapChange, card } = renderPanel("peek")
    swipe(card, 500, 600, 100)
    expect(onSnapChange).toHaveBeenLastCalledWith("map")
  })

  it("the pulled-up list is lowered by its handle", () => {
    const { onSnapChange } = renderPanel("list")
    const handle = screen.getByRole("button", { name: "Stáhnout seznam" })
    expect(handle).toHaveAttribute("aria-expanded", "true")
    swipe(handle, 100, 220, 100)
    expect(onSnapChange).toHaveBeenLastCalledWith("peek")
  })

  it("tapping the handle steps up: map → peek → list, and list → peek", async () => {
    for (const [from, to] of [
      ["map", "peek"],
      ["peek", "list"],
      ["list", "peek"],
    ] as const) {
      const { onSnapChange } = renderPanel(from)
      await userEvent.click(screen.getByRole("button", { name: /seznam$/ }))
      expect(onSnapChange).toHaveBeenCalledExactlyOnceWith(to)
      document.body.innerHTML = ""
    }
  })

  it("a drag that ends on the handle counts once, not also as a tap", () => {
    const { onSnapChange } = renderPanel("peek")
    const handle = screen.getByRole("button", { name: "Vytáhnout seznam" })
    swipe(handle, 600, 500, 100)
    fireEvent.click(handle)
    expect(onSnapChange).toHaveBeenCalledExactlyOnceWith("list")
  })

  it("a tap on a card is not a sheet gesture", () => {
    const { onSnapChange, card } = renderPanel("peek")
    swipe(card, 600, 601, 80)
    fireEvent.click(card)
    expect(onSnapChange).not.toHaveBeenCalled()
  })

  it("a drag that ends on a card doesn't open it; the next tap does", () => {
    const onOpen = vi.fn()
    render(
      <ListPanel
        snap="peek"
        onSnapChange={vi.fn()}
      >
        <button
          type="button"
          data-peek-end
          onClick={onOpen}
        >
          Deskovky po práci
        </button>
      </ListPanel>,
    )
    const card = screen.getByRole("button", { name: "Deskovky po práci" })

    swipe(card, 600, 500, 100)
    fireEvent.click(card)
    expect(onOpen).not.toHaveBeenCalled()

    swipe(card, 600, 601, 80)
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("moves with the finger while dragging, and settles with an animation", () => {
    const { sheet, card } = renderPanel("peek")

    fireEvent.pointerDown(card, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(card, { clientY: 110, pointerId: 1 })
    expect(sheet.style.transform).toBe("translateY(10px)")
    // no transition while the finger drives it
    expect(sheet.className).not.toContain("transition-transform")
    fireEvent.pointerUp(card, { clientY: 110, pointerId: 1 })
    expect(sheet.className).toContain("transition-transform")
  })

  it("the mouse wheel over the lowered sheet pulls it up", () => {
    const { onSnapChange, sheet } = renderPanel("peek")
    fireEvent.wheel(sheet, { deltaY: 40 })
    expect(onSnapChange).toHaveBeenCalledWith("list")
  })

  it("works from the keyboard", async () => {
    const { onSnapChange } = renderPanel("peek")
    screen.getByRole("button", { name: "Vytáhnout seznam" }).focus()
    await userEvent.keyboard("{Enter}")
    expect(onSnapChange).toHaveBeenCalledWith("list")
  })

  it("reports how much of the resting sheet shows, so the map keeps its attribution above it", () => {
    const onVisibleHeightChange = vi.fn()
    renderPanel("peek", { onVisibleHeightChange })
    expect(onVisibleHeightChange).toHaveBeenCalled()
  })
})
