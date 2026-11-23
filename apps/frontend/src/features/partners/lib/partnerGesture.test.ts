import { describe, expect, it } from "vitest"

import {
  dragIntent,
  dragProgress,
  flingDurationMs,
  releaseDirection,
  tiltDeg,
} from "./partnerGesture"

const WIDTH = 400

describe("the swipe's numbers (#84)", () => {
  it("tilts with the drag, at most 15° either way", () => {
    expect(tiltDeg(0, WIDTH)).toBe(0)
    expect(tiltDeg(200, WIDTH)).toBe(7.5)
    expect(tiltDeg(1000, WIDTH)).toBe(15)
    expect(tiltDeg(-1000, WIDTH)).toBe(-15)
  })

  it("the stamp is fully on at 30 % of the card's width", () => {
    expect(dragProgress(60, WIDTH)).toBe(0.5)
    expect(dragProgress(-120, WIDTH)).toBe(1)
    expect(dragProgress(500, WIDTH)).toBe(1)
  })

  it("starts a drag only past 8 px, and leaves a vertical move to the page's scroll", () => {
    expect(dragIntent(5, 3)).toBeUndefined()
    expect(dragIntent(12, 4)).toBe("drag")
    expect(dragIntent(4, 12)).toBe("scroll")
  })

  it("commits far enough or flicked fast the same way, else springs back", () => {
    expect(releaseDirection(130, 0, WIDTH)).toBe("request")
    expect(releaseDirection(-130, 0, WIDTH)).toBe("skip")
    expect(releaseDirection(60, 0.2, WIDTH)).toBeUndefined()
    expect(releaseDirection(40, 0.8, WIDTH)).toBe("request")
    // a flick back against the drag doesn't count
    expect(releaseDirection(40, -0.8, WIDTH)).toBeUndefined()
    // too short for a flick
    expect(releaseDirection(20, 2, WIDTH)).toBeUndefined()
  })

  it("flies off in 180–320 ms, faster for a faster release", () => {
    expect(flingDurationMs(1000, 0)).toBe(320)
    expect(flingDurationMs(1000, 5)).toBe(200)
    expect(flingDurationMs(100, 5)).toBe(180)
  })
})
