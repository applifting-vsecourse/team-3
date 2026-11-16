import { readdirSync, readFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

// DESIGN.md › Colour: text contrast at least 4.5:1, every other element 3:1, and the tokens are
// what keeps it. This reads the real token values from :root — the app has a light mode only
// (PO 10. 11. 2026, #297).
const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8")

const declared: Record<string, string> = (() => {
  const block = /(?:^|\n):root\s*\{([^}]*)\}/.exec(css)?.[1]
  if (!block) throw new Error("no :root block in global.css")
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|var\(--[\w-]+\));/gi)].map(
      ([, name = "", value = ""]): [string, string] => [name, value],
    ),
  )
})()

// a var() alias resolves to the value it points at, the way the browser computes it
const resolveToken = (name: string): string => {
  const value = declared[name]
  if (!value) throw new Error(`--${name} is not declared in :root`)
  const alias = /^var\(--([\w-]+)\)$/.exec(value)?.[1]
  return alias ? resolveToken(alias) : value
}
const tokens = Object.fromEntries(Object.keys(declared).map((name) => [name, resolveToken(name)]))

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
  ["primary", "hero"], // lime text on the landing band: „Třeba ty.“, „Jak to funguje“ (#182)
  ["on-hero", "hero-pattern"], // header item and button hover on the band (the on-hero utility)
  ["badge-neutral-foreground", "badge-neutral"], // „Plno“, „Čeká na schválení“
  ["avatar-self-foreground", "avatar-self"], // the „ty“ avatar
  ["highlight-text", "background"], // section keyword
  ["highlight-text", "highlight-marker"], // …over its marker
  ["accent-foreground", "accent"], // hovered or active row in a list or menu
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
  ["hero", "background"], // bottom edge of the band, „Jak to funguje“, „Nic pro tebe?“
  ["tile-on-hero", "hero"], // activity tile on the band
  ["avatar-self", "card"],
  ["foreground", "card"], // full rating star
  ["ring", "background"], // focus ring
  ["ring", "card"],
  ["ring", "muted"], // a focused chip, row or tile on a quiet surface
  ["destructive", "card"], // focus ring of an invalid field
]

describe("tokens", () => {
  it.each(TEXT_PAIRS)("%s on %s is at least 4.5:1", (text, surface) => {
    expect(contrast(tokens[text]!, tokens[surface]!)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(EDGE_PAIRS)("%s against %s is at least 3:1", (element, surround) => {
    expect(contrast(tokens[element]!, tokens[surround]!)).toBeGreaterThanOrEqual(3)
  })

  // A surface, not an edge, so not 3:1 — but the row under the pointer or the keyboard in a
  // panel must stand out from it.
  it("the hover surface (accent) stands out from a card or panel", () => {
    expect(contrast(tokens.accent!, tokens.card!)).toBeGreaterThanOrEqual(1.25)
  })

  // The quiet surfaces (the Detail row's icon box, empty bars, banners) must stay visible on a
  // card, not a smudge behind the icon.
  it("a quiet surface (muted) stands out from a card or panel", () => {
    expect(contrast(tokens.muted!, tokens.card!)).toBeGreaterThanOrEqual(1.25)
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

  // DESIGN.md › Capacity bar: the two stripes of the hatch below the minimum — lime, and the
  // dark stripe mixed over it (Figma: primary-foreground at 55 %)
  const [, limeToken = "", stripeToken = "", share = "", underToken = ""] =
    /@utility capacity-hatch[\s\S]*?var\(--([\w-]+)\) 0 3px,\s*color-mix\(in srgb, var\(--([\w-]+)\) (\d+)%, var\(--([\w-]+)\)\) 3px 6px/.exec(
      css,
    ) ?? []
  const lime = tokens[limeToken]!
  const stripe = mix(tokens[stripeToken]!, tokens[underToken]!, Number(share) / 100)

  // it has to read as stripes, or „Chybí“ looks like „Volná místa“…
  it("the capacity hatch stripes are at least 3:1 against each other", () => {
    expect(contrast(stripe, lime)).toBeGreaterThanOrEqual(3)
  })

  // …and stand out from the track: the dark stripe does (lime on the cream track is 1.03:1)
  it("one of the hatch stripes is at least 3:1 against the track", () => {
    const track = tokens["capacity-track"]!
    expect(Math.max(contrast(stripe, track), contrast(lime, track))).toBeGreaterThanOrEqual(3)
  })

  // #166: the minimum marker (foreground, with a gap in the surface's colour around it, Figma
  // Tick) must show wherever it sits: on the track, on either stripe of the hatch, on lime and
  // on the solid fill. Where the marker itself vanishes, the gap carries it.
  // The gap is `card` in cards and the desktop panel, `background` on the phone's detail.
  it.each(
    (["card", "background"] as const).flatMap((gap) =>
      (
        [
          ["the track", "capacity-track"],
          ["lime", "primary"],
          ["the hatch stripe", "stripe"],
          ["the solid fill", "capacity-fill"],
        ] as const
      ).map(([name, under]) => [gap, name, under] as const),
    ),
  )("with a %s gap, the minimum marker or its gap is at least 3:1 against %s", (gap, _, under) => {
    const surface = under === "stripe" ? stripe : tokens[under]!
    expect(
      Math.max(contrast(tokens.foreground!, surface), contrast(tokens[gap]!, surface)),
    ).toBeGreaterThanOrEqual(3)
  })
})

// DESIGN.md › Colour, #297: the app has a light mode only — no dark tokens, no dark: classes,
// and the page never follows a dark system setting. `pnpm dlx shadcn add` brings dark: shades
// into components/ui, so they are stripped on arrival.
describe("light mode only", () => {
  const src = resolve(process.cwd(), "src")
  const self = resolve(src, "styles/tokens.test.ts")
  const sources = (readdirSync(src, { recursive: true }) as string[])
    .map((name) => join(src, name))
    .filter((path) => /\.(tsx?|css)$/.test(path) && path !== self)

  it.each(sources.map((path) => [relative(src, path), path]))(
    "%s has no dark: classes and no .dark selector",
    (_, path) => {
      const source = readFileSync(path, "utf8")
      expect(source.match(/\bdark:[^\s"'`]+|\.dark\b/g) ?? []).toEqual([])
    },
  )

  // #298: the kit's ring-ring/50 is 2.45:1 on the page (ring-destructive/20 1.4:1) — under
  // the 3:1 a focus indicator needs, and a control without a border has no other one. axe
  // does not check focus, so the classes are checked here. `pnpm dlx shadcn add` brings them.
  it.each(sources.map((path) => [relative(src, path), path]))(
    "%s draws focus rings in a token's full colour",
    (_, path) => {
      const source = readFileSync(path, "utf8")
      expect(source.match(/\b(?:ring|outline)-(?:ring|destructive|on-hero)\/\d+/g) ?? []).toEqual(
        [],
      )
    },
  )

  it("the page keeps light native controls and declares no dark scheme", () => {
    expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light;/)
    expect(css).not.toMatch(/color-scheme:\s*dark/)
  })

  // index.html cannot read a CSS variable before the app loads, so the browser chrome's colour
  // is written there once — it has to stay the band's colour (the header sits on the band).
  // Every <meta> naming theme-color counts, whatever the attribute order — a second one written
  // as name, media, content must not slip past.
  it("index.html has one theme-color, the band's --hero", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8")
    const colors = [...html.matchAll(/<meta\b[^>]*>/gi)]
      .map(([tag]) => tag)
      .filter((tag) => /\bname=["']theme-color["']/i.test(tag))
      .map((tag) => /\bcontent=["']([^"']*)["']/i.exec(tag)?.[1]?.toLowerCase())
    expect(colors).toEqual([tokens.hero])
    expect(html).not.toMatch(/prefers-color-scheme/i)
  })
})
