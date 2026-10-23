import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// DESIGN.md › Accessibility: text contrast at least 4.5:1, and the tokens are
// what keeps it. This reads the real token values, light (:root) and dark (.dark).
const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8")

const tokensOf = (selector: string): Record<string, string> => {
  const block = new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(
    css,
  )?.[1]
  if (!block) throw new Error(`no ${selector} block in global.css`)
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(
      ([, name = "", hex = ""]): [string, string] => [name, hex],
    ),
  )
}

const luminance = (hex: string) => {
  const [r, g, b] = (hex.slice(1).match(/../g) ?? []).map((h) => {
    const v = parseInt(h, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// [text, surface] pairs the app actually uses
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"], // „Plno“ badge
  ["primary-foreground", "primary"], // „Chybí“ badge, primary buttons
  ["secondary-foreground", "secondary"], // „Volná místa“, activity tile
  ["background", "foreground"], // selected chip, pin label
  ["destructive", "card"], // error alert
  ["destructive", "background"],
]

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("%s tokens", (_, selector) => {
  const tokens = tokensOf(selector)

  it.each(TEXT_PAIRS)("%s on %s is at least 4.5:1", (text, surface) => {
    expect(contrast(tokens[text]!, tokens[surface]!)).toBeGreaterThanOrEqual(4.5)
  })

  it("the checkbox edge (muted-foreground) is at least 3:1 against the page", () => {
    expect(contrast(tokens["muted-foreground"]!, tokens.background!)).toBeGreaterThanOrEqual(3)
  })
})
