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

  // review #311: the band's tabs and PageBand's motif share this height
  it("lets the band-tabs spacing replace the kit's height", () => {
    expect(cn("h-[calc(100%-1px)]", "h-band-tabs")).toBe("h-band-tabs")
    expect(cn("bottom-0", "bottom-band-tabs")).toBe("bottom-band-tabs")
  })
})
