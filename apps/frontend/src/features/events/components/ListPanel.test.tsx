import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListPanel } from "@/features/events/components/ListPanel"

describe("ListPanel", () => {
  it("is pulled up by tapping the handle", async () => {
    const onExpandedChange = vi.fn()
    render(
      <ListPanel
        isExpanded={false}
        onExpandedChange={onExpandedChange}
      >
        <p>1 akce</p>
      </ListPanel>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Vytáhnout seznam" }))
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })

  it("is pulled up by swiping the handle up", () => {
    const onExpandedChange = vi.fn()
    render(
      <ListPanel
        isExpanded={false}
        onExpandedChange={onExpandedChange}
      >
        <p>1 akce</p>
      </ListPanel>,
    )

    const handle = screen.getByRole("button", { name: "Vytáhnout seznam" })
    fireEvent.pointerDown(handle, { clientY: 600 })
    fireEvent.pointerUp(handle, { clientY: 500 })
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })

  it("has no handle when pulled up (the „Mapa“ button closes it)", () => {
    render(
      <ListPanel
        isExpanded
        onExpandedChange={vi.fn()}
      >
        <p>3 akce</p>
      </ListPanel>,
    )

    expect(screen.queryByRole("button", { name: "Vytáhnout seznam" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Seznam akcí" })).toHaveTextContent("3 akce")
  })
})
