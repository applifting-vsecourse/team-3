import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("keeps the custom font sizes next to a text colour", () => {
    expect(cn("text-caption text-muted-foreground")).toBe("text-caption text-muted-foreground")
    expect(cn("text-body text-foreground")).toBe("text-body text-foreground")
  })

  it("lets a later font size replace a custom one", () => {
    expect(cn("text-caption", "text-sm")).toBe("text-sm")
    expect(cn("text-sm", "text-body")).toBe("text-body")
  })

  // review #384: DialogTitle's kit classes made the onboarding headings 18 px SemiBold
  it("lets a type-* style replace the kit's size, weight and leading", () => {
    expect(cn("text-lg leading-none font-semibold", "type-title")).toBe("type-title")
    expect(cn("text-sm font-semibold", "type-card-heading")).toBe("type-card-heading")
  })

  it("keeps what a type-* style does not set", () => {
    expect(cn("font-semibold", "type-lead")).toBe("font-semibold type-lead")
    expect(cn("tracking-wide", "type-feature")).toBe("tracking-wide type-feature")
    expect(cn("type-title text-balance text-foreground")).toBe(
      "type-title text-balance text-foreground",
    )
    expect(cn("text-body md:type-intro")).toBe("text-body md:type-intro")
  })

  it("lets a later type-* style replace an earlier one", () => {
    expect(cn("type-title", "type-feature")).toBe("type-feature")
  })

  // review #311: the band's tabs and PageBand's motif share this height
  it("lets the band-tabs spacing replace the kit's height", () => {
    expect(cn("h-[calc(100%-1px)]", "h-band-tabs")).toBe("h-band-tabs")
    expect(cn("bottom-0", "bottom-band-tabs")).toBe("bottom-band-tabs")
  })
})
