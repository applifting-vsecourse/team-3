import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EventsMap } from "@/features/events/components/EventsMap"
import { anEvent } from "@/features/events/test/anEvent"

const events = [anEvent({ id: "e1", lat: 50.1, lng: 14.45 })]
const praha = { lat: 50.0755, lng: 14.4378 }

const renderMap = (selectedId?: string) => {
  const onSelect = vi.fn()
  const { container } = render(
    <EventsMap
      events={events}
      selectedId={selectedId}
      onSelect={onSelect}
      center={praha}
      onAreaSearch={vi.fn()}
    />,
  )
  const pin = container.querySelector(".leaflet-marker-icon")
  if (!pin) throw new Error("no pin")
  return { onSelect, pin }
}

describe("EventsMap selection (#56)", () => {
  it("a tap on a pin selects its event instead of leaving the page", () => {
    const { onSelect, pin } = renderMap()

    fireEvent.click(pin)
    expect(onSelect).toHaveBeenCalledWith("e1")
  })

  it("a second tap on the selected pin unselects it", () => {
    const { onSelect, pin } = renderMap("e1")

    fireEvent.click(pin)
    expect(onSelect).toHaveBeenCalledWith(undefined)
  })
})
