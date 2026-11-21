import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PickedForYou } from "@/features/events/components/PickedForYou"
import { anEvent } from "@/features/events/test/anEvent"

const pick = (key: string, label: string) => ({
  key,
  label,
  description: "popis",
  events: [anEvent()],
  more: { to: "/akce" as const },
})

describe("PickedForYou", () => {
  // #370: between 768 and 900 px the six picks don't fit; a strip that couldn't shrink
  // (flex-none) widened the page to 918 px instead of scrolling sideways
  it("the strip may shrink and scrolls sideways instead of widening the page", async () => {
    await renderWithRouter(
      <PickedForYou
        picks={[pick("chybis", "Tady chybíš"), pick("vikend", "Tento víkend")]}
      />,
    )

    const strip = screen.getByRole("tablist", { name: "Rychlé výběry" })
    expect(strip).toHaveClass("min-w-0", "overflow-x-auto", "md:flex-initial")
    expect(strip).not.toHaveClass("md:flex-none")
  })
})
