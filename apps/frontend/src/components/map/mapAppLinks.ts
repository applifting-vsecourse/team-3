/**
 * The event's place in a map app, for directions (#373): Mapy.com, which most Czech users have,
 * and Google Maps, whose link opens its app on a phone. Coordinates only — the pin is the place
 * the organizer chose, the address may be a meeting point's description.
 */
export function mapAppLinks({ lat, lng }: { lat: number; lng: number }) {
  return [
    {
      label: "Mapy.com",
      href: `https://mapy.com/fnc/v1/showmap?mapset=basic&center=${lng},${lat}&zoom=16&marker=true`,
    },
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    },
  ] as const
}
