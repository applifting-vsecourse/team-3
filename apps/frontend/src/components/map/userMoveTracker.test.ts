import { describe, expect, it } from "vitest"

import { createUserMoveTracker } from "./userMoveTracker"

const aTracker = () => {
  let time = 10_000
  const tracker = createUserMoveTracker(() => time)
  return { tracker, wait: (ms: number) => (time += ms) }
}

describe("createUserMoveTracker", () => {
  it("counts a drag: the move starts while the pointer is down", () => {
    const { tracker, wait } = aTracker()
    tracker.pointerDown()
    wait(2_000)
    tracker.moveStart()
    tracker.pointerUp()
    wait(800) // inertia
    expect(tracker.moveEnd()).toBe(true)
  })

  it("counts a wheel zoom or a tap on a cluster: the move starts right after the input", () => {
    const { tracker, wait } = aTracker()
    tracker.input()
    wait(40)
    tracker.moveStart()
    expect(tracker.moveEnd()).toBe(true)
  })

  it("never counts the map fitting itself after a tap that moved nothing", () => {
    const { tracker, wait } = aTracker()
    tracker.pointerDown()
    tracker.pointerUp() // a tap on a pin
    wait(3_000) // then a filter changes and the map fits the new pins
    tracker.moveStart()
    expect(tracker.moveEnd()).toBe(false)
  })

  it("never counts a fit without any input", () => {
    const { tracker } = aTracker()
    tracker.moveStart()
    expect(tracker.moveEnd()).toBe(false)
  })

  it("forgets the user's move once it ended", () => {
    const { tracker, wait } = aTracker()
    tracker.input()
    tracker.moveStart()
    tracker.moveEnd()
    wait(3_000)
    tracker.moveStart()
    expect(tracker.moveEnd()).toBe(false)
  })
})
