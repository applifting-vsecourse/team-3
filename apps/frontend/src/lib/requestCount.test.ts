import { describe, expect, it } from "vitest"

import { requestCountLabel, requestsWaitingLabel } from "@/lib/requestCount"

describe("requestCountLabel", () => {
  it.each([
    [1, "1 žádost"],
    [2, "2 žádosti"],
    [4, "4 žádosti"],
    [5, "5 žádostí"],
  ])("%i → %s", (count, label) => {
    expect(requestCountLabel(count)).toBe(label)
  })
})

describe("requestsWaitingLabel", () => {
  it.each([
    [1, "1 žádost čeká"],
    [3, "3 žádosti čekají"],
    [5, "5 žádostí čeká"],
  ])("%i → %s", (count, label) => {
    expect(requestsWaitingLabel(count)).toBe(label)
  })
})
