import { describe, expect, it } from "vitest"

import {
  countCharacters,
  REQUEST_MESSAGE_MAX_LENGTH,
  requestMessageSchema,
  toRequestMessage,
} from "./requestMessage"

describe("requestMessageSchema (#175)", () => {
  it(`allows ${REQUEST_MESSAGE_MAX_LENGTH} characters, counted after trimming`, () => {
    const longest = "x".repeat(REQUEST_MESSAGE_MAX_LENGTH)
    expect(requestMessageSchema.safeParse(`  ${longest}  `).success).toBe(true)
    expect(requestMessageSchema.safeParse(`${longest}x`).error?.issues[0]?.message).toBe(
      "Zpráva může mít nejvýš 500 znaků",
    )
  })

  it("counts an emoji as one character, like the API", () => {
    expect(countCharacters("🎲")).toBe(1)
    expect(requestMessageSchema.safeParse("🎲".repeat(REQUEST_MESSAGE_MAX_LENGTH)).success).toBe(
      true,
    )
    expect(
      requestMessageSchema.safeParse("🎲".repeat(REQUEST_MESSAGE_MAX_LENGTH + 1)).success,
    ).toBe(false)
  })
})

describe("toRequestMessage", () => {
  it("trims, and blank is none", () => {
    expect(toRequestMessage("  Ahoj \n")).toBe("Ahoj")
    expect(toRequestMessage("   ")).toBeNull()
  })
})
