import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EventSearch } from "@/features/events/components/EventSearch"

const field = () => screen.getByRole("searchbox", { name: "Hledat akci nebo aktivitu" })

describe("EventSearch (#57)", () => {
  it("writes the search once typing stops, trimmed, once", async () => {
    const onChange = vi.fn()
    render(
      <EventSearch
        value={undefined}
        onChange={onChange}
      />,
    )

    await userEvent.type(field(), " volejbal ")
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("volejbal"))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("writes at once on Enter, and an emptied field is no search", async () => {
    const onChange = vi.fn()
    render(
      <EventSearch
        value="kviz"
        onChange={onChange}
      />,
    )

    await userEvent.clear(field())
    await userEvent.keyboard("{Enter}")
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("shows a search changed from outside, e.g. „Zrušit vše“", () => {
    const { rerender } = render(
      <EventSearch
        value="kviz"
        onChange={vi.fn()}
      />,
    )
    expect(field()).toHaveValue("kviz")

    rerender(
      <EventSearch
        value={undefined}
        onChange={vi.fn()}
      />,
    )
    expect(field()).toHaveValue("")
  })
})
