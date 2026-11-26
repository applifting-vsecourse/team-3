import { describe, expect, it } from "vitest"

import { mapAppLinks } from "./mapAppLinks"

describe("mapAppLinks", () => {
  it("points Mapy.com (lng,lat) and Google Maps (lat,lng) at the event's pin", () => {
    expect(mapAppLinks({ lat: 50.0875, lng: 14.4213 })).toEqual([
      {
        label: "Mapy.com",
        href: "https://mapy.com/fnc/v1/showmap?mapset=basic&center=14.4213,50.0875&zoom=16&marker=true",
      },
      {
        label: "Google Maps",
        href: "https://www.google.com/maps/search/?api=1&query=50.0875,14.4213",
      },
    ])
  })
})
