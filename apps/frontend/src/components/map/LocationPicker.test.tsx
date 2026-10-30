import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LocationPicker } from "./LocationPicker"

const karlin = { lat: 50.0928, lng: 14.4508 }

const renderPicker = (value: { lat: number; lng: number } | null, onChange = vi.fn()) => {
  const view = render(
    <>
      <p id="map-label">Místo na mapě</p>
      <LocationPicker
        value={value}
        onChange={onChange}
        center={karlin}
        labelledBy="map-label"
      />
    </>,
  )
  return { ...view, onChange }
}

describe("LocationPicker", () => {
  it("is named by its heading and shows no pin until a place is picked", () => {
    const { container } = renderPicker(null)

    expect(screen.getByRole("region", { name: "Místo na mapě" })).toBeInTheDocument()
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(0)
  })

  it("picks the middle of the map from the keyboard-reachable button", async () => {
    const { onChange } = renderPicker(null)

    await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))

    expect(onChange).toHaveBeenCalledOnce()
    const point = onChange.mock.calls[0]![0] as { lat: number; lng: number }
    expect(point.lat).toBeCloseTo(karlin.lat, 3)
    expect(point.lng).toBeCloseTo(karlin.lng, 3)
  })

  it("shows the picked place as a pin", () => {
    const { container } = renderPicker(karlin)

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1)
  })

  it("brings a place set from outside, e.g. a found address, into view", async () => {
    const letna = { lat: 50.0965, lng: 14.4237 }
    const { rerender, onChange } = renderPicker(null)

    rerender(
      <>
        <p id="map-label">Místo na mapě</p>
        <LocationPicker
          value={letna}
          onChange={onChange}
          center={karlin}
          labelledBy="map-label"
        />
      </>,
    )
    // the middle of the map is now the found place
    await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))

    const point = onChange.mock.calls[0]![0] as { lat: number; lng: number }
    expect(point.lat).toBeCloseTo(letna.lat, 3)
    expect(point.lng).toBeCloseTo(letna.lng, 3)
  })

  it("opens on an already picked place, not on the locality (editing an event)", async () => {
    const letnany = { lat: 50.1333, lng: 14.5167 }
    const { onChange } = renderPicker(letnany)

    await userEvent.click(screen.getByRole("button", { name: "Umístit špendlík do středu mapy" }))

    const point = onChange.mock.calls[0]![0] as { lat: number; lng: number }
    expect(point.lat).toBeCloseTo(letnany.lat, 3)
    expect(point.lng).toBeCloseTo(letnany.lng, 3)
  })
})
