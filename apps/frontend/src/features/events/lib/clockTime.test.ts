import { describe, expect, it } from "vitest"

import { normalizeClockTime } from "@/features/events/lib/clockTime"

describe("typed 24-hour time (#200)", () => {
  it.each([
    ["9:00", "09:00"],
    ["09:00", "09:00"],
    ["9.00", "09:00"],
    ["23.59", "23:59"],
    ["900", "09:00"],
    ["0900", "09:00"],
    ["930", "09:30"],
    ["0930", "09:30"],
    ["0:00", "00:00"],
    ["000", "00:00"],
    ["0000", "00:00"],
    ["23:59", "23:59"],
    ["2359", "23:59"],
    [" 9:00 ", "09:00"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeClockTime(input)).toBe(expected)
  })

  it.each([
    "",
    " ",
    "9",
    "09",
    "9:",
    "9:0",
    "9:000",
    "9::00",
    "24:00",
    "25:00",
    "9:99",
    "2360",
    "2400",
    "-1:00",
    "9.99",
    "9.0",
    "9:00 PM",
    "12:00:00",
    "12345",
    "１２３４",
    "1e3",
  ])("does not guess, truncate or roll over %j", (input) => {
    expect(normalizeClockTime(input)).toBeNull()
  })
})
