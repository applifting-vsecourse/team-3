import { readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

// DESIGN.md › Accessibility: text contrast at least 4.5:1, and the tokens are
// what keeps it. This reads the real token values, light (:root) and dark (.dark).
const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8")

const declarationsOf = (selector: string): Record<string, string> => {
  const block = new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(
    css,
  )?.[1]
  if (!block) throw new Error(`no ${selector} block in global.css`)
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|var\(--[\w-]+\)|transparent);/gi)].map(
      ([, name = "", value = ""]): [string, string] => [name, value],
    ),
  )
}

// .dark only overrides what differs, and a var() alias resolves against the mode it is used in
// — the same way the browser computes it on <html class="dark">.
const tokensOf = (selector: string): Record<string, string> => {
  const declared = {
    ...declarationsOf(":root"),
    ...(selector === ":root" ? {} : declarationsOf(selector)),
  }
  const resolve = (name: string): string => {
    const value = declared[name]
    if (!value) throw new Error(`--${name} is not declared for ${selector}`)
    const alias = /^var\(--([\w-]+)\)$/.exec(value)?.[1]
    return alias ? resolve(alias) : value
  }
  const tokens = Object.fromEntries(Object.keys(declared).map((name) => [name, resolve(name)]))
  // a transparent token shows the page through (the marker in dark mode)
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [
      name,
      value === "transparent" ? tokens.background! : value,
    ]),
  )
}

const luminance = (hex: string) => {
  const [r, g, b] = (hex.slice(1).match(/../g) ?? []).map((h) => {
    const v = parseInt(h, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// color-mix(in srgb, a p%, b): channel by channel, the way the browser mixes it
const mix = (a: string, b: string, p: number) =>
  `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`

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
  ["destructive-foreground", "destructive"], // destructive button
  ["on-hero", "hero"], // H1 on the band
  ["on-hero-muted", "hero"], // supporting line on the band
  ["on-hero", "hero-pattern"], // header item and button hover on the band (the on-hero utility)
  ["badge-neutral-foreground", "badge-neutral"], // „Plno“, „Čeká na schválení“
  ["avatar-self-foreground", "avatar-self"], // the „ty“ avatar
  ["highlight-text", "background"], // section keyword (lime word in dark mode)
  ["highlight-text", "highlight-marker"], // …over its marker in light mode
]

// DESIGN.md › Colour: every non-text element and every surface edge at least 3:1 against
// what is around it. [element, surround]
const EDGE_PAIRS: [string, string][] = [
  ["card-border", "background"], // card and panel edge
  ["input-border", "card"], // input edge
  ["input-border", "background"],
  ["control-border", "card"], // outline button, neutral badge, capacity track outline, empty star
  ["control-border", "background"],
  ["tile-border", "card"], // edge of every secondary surface
  ["tile-border", "background"],
  ["primary-edge", "card"], // lime on a light surface
  ["primary-edge", "background"],
  ["capacity-fill", "capacity-track"], // solid fill once the minimum is reached
  ["full", "card"], // full bar covers the whole track
  ["band-edge", "background"], // bottom edge of the band
  ["tile-on-hero", "hero"], // activity tile on the band
  ["avatar-self", "card"],
  ["foreground", "card"], // full rating star
  ["ring", "background"], // focus ring
  ["ring", "card"],
]

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("%s tokens", (_, selector) => {
  const tokens = tokensOf(selector)

  it.each(TEXT_PAIRS)("%s on %s is at least 4.5:1", (text, surface) => {
    expect(contrast(tokens[text]!, tokens[surface]!)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(EDGE_PAIRS)("%s against %s is at least 3:1", (element, surround) => {
    expect(contrast(tokens[element]!, tokens[surround]!)).toBeGreaterThanOrEqual(3)
  })

  it("destructive-foreground on the destructive hover is at least 4.5:1", () => {
    const [, share = "", other = ""] =
      /--color-destructive-hover:\s*color-mix\(in srgb, var\(--destructive\) (\d+)%, var\(--([\w-]+)\)\)/.exec(
        css,
      ) ?? []
    const hover = mix(tokens.destructive!, tokens[other]!, Number(share) / 100)
    expect(contrast(tokens["destructive-foreground"]!, hover)).toBeGreaterThanOrEqual(4.5)
  })

  it("the checkbox edge (muted-foreground) is at least 3:1 against the page", () => {
    expect(contrast(tokens["muted-foreground"]!, tokens.background!)).toBeGreaterThanOrEqual(3)
  })

  // DESIGN.md › Capacity bar: the two stripes of the hatch below the minimum
  const [, limeToken = "", stripeToken = ""] =
    /@utility capacity-hatch[\s\S]*?var\(--([\w-]+)\) 0 3px,\s*var\(--([\w-]+)\) 3px 6px/.exec(
      css,
    ) ?? []
  const lime = tokens[limeToken]!
  const stripe = tokens[stripeToken]!

  // it has to read as stripes, or „Chybí“ looks like „Volná místa“…
  it("the capacity hatch stripes are at least 3:1 against each other", () => {
    expect(contrast(stripe, lime)).toBeGreaterThanOrEqual(3)
  })

  // …and stand out from the track: in light mode the dark stripe does, in dark mode the lime
  it("one of the hatch stripes is at least 3:1 against the track", () => {
    const track = tokens["capacity-track"]!
    expect(Math.max(contrast(stripe, track), contrast(lime, track))).toBeGreaterThanOrEqual(3)
  })

  // #166: the minimum marker (foreground, with a background-coloured gap around it) must
  // show wherever it sits: on the track, on either stripe of the hatch and on lime. In dark
  // mode the marker itself vanishes on lime, so there the gap has to carry it.
  it.each([
    ["the track", "capacity-track"],
    ["lime", "primary"],
    ["the hatch stripe", "stripe"],
  ])("the minimum marker or its gap is at least 3:1 against %s", (_, under) => {
    const surface = under === "stripe" ? stripe : tokens[under]!
    expect(
      Math.max(contrast(tokens.foreground!, surface), contrast(tokens.background!, surface)),
    ).toBeGreaterThanOrEqual(3)
  })
})

// DESIGN.md › Colour, #201: dark mode comes from the .dark tokens alone. A kit control with its
// own dark: shades drifts from Figma, and every recoloured state on top of it would have to
// restate them. `pnpm dlx shadcn add` brings them back, so they are stripped on arrival.
describe("kit in components/ui", () => {
  const dir = resolve(process.cwd(), "src/components/ui")
  const files = readdirSync(dir).filter((name) => name.endsWith(".tsx"))

  it.each(files)("%s has no dark: classes", (name) => {
    const source = readFileSync(join(dir, name), "utf8")
    expect(source.match(/\bdark:[^\s"'`]+/g) ?? []).toEqual([])
  })
})
