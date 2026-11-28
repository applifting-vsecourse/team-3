import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Link previews (#475): crawlers read index.html as it is, without running the app.
const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8")

const metaOf = (key: string): string | undefined => {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(([match]) => match)
    .find((match) => new RegExp(`\\b(?:property|name)="${key}"`).test(match))
  return tag ? /\bcontent="([^"]*)"/.exec(tag)?.[1] : undefined
}

describe("link preview tags in index.html (#475)", () => {
  it("has the Open Graph and Twitter tags", () => {
    expect(metaOf("og:site_name")).toBe("HobbyHub")
    expect(metaOf("og:type")).toBe("website")
    expect(metaOf("og:locale")).toBe("cs_CZ")
    expect(metaOf("og:title")).toBe("HobbyHub – akce a parťáci na koníčky")
    expect(metaOf("og:description")).toBe(metaOf("description"))
    expect(metaOf("og:image:width")).toBe("1200")
    expect(metaOf("og:image:height")).toBe("630")
    expect(metaOf("og:image:alt")).toBe("Logo HobbyHub na zeleném pozadí")
    expect(metaOf("twitter:card")).toBe("summary_large_image")
  })

  it("the image is an absolute URL from the build's VITE_PUBLIC_URL", () => {
    expect(metaOf("og:image")).toBe("%VITE_PUBLIC_URL%/og-hobbyhub.png")
  })

  it("the image is a 1200 × 630 PNG under 300 kB", () => {
    const path = resolve(process.cwd(), "public/og-hobbyhub.png")
    const png = readFileSync(path)
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG")
    // IHDR: width and height right after the signature and the chunk header
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
    expect(statSync(path).size).toBeLessThan(300 * 1024)
  })
})
