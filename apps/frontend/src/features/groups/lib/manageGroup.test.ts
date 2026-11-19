import { describe, expect, it } from "vitest"

import { groupEmptySteps, groupNextStep } from "./manageGroup"

describe("groupNextStep (#371)", () => {
  it.each([
    [1, "Čeká 1 žádost o členství. Schval je, nebo zamítni v seznamu Žádosti."],
    [2, "Čekají 2 žádosti o členství. Schval je, nebo zamítni v seznamu Žádosti."],
    [5, "Čeká 5 žádostí o členství. Schval je, nebo zamítni v seznamu Žádosti."],
  ])("waiting requests come first (%i)", (count, text) => {
    expect(groupNextStep(count, 4)).toEqual({ action: "decide", text })
  })

  it("invites people while the admin is alone", () => {
    expect(groupNextStep(0, 1)).toEqual({
      action: "invite",
      text: "Ve skupině jsi zatím jen ty. Pošli odkaz lidem, se kterými hraješ.",
    })
  })

  it("writes to the members otherwise", () => {
    expect(groupNextStep(0, 5).action).toBe("write")
  })
})

describe("groupEmptySteps (#371)", () => {
  it("speaks of requests in a closed group, of joining in a public one", () => {
    expect(groupEmptySteps("closed")[1]).toBe(
      "Neveřejná skupina: každá žádost o členství se objeví tady a schválíš ji.",
    )
    expect(groupEmptySteps("public")[1]).toBe("Kdo se ke skupině přidá, objeví se tady mezi členy.")
  })
})
