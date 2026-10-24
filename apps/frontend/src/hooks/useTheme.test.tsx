import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/hooks/useTheme"

const metas = () => [...document.querySelectorAll('meta[name="theme-color"]')]

describe("ThemeProvider", () => {
  // next-themes asks for the system scheme; jsdom has no matchMedia
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const meta of metas()) meta.remove()
    document.documentElement.removeAttribute("style")
    document.documentElement.classList.remove("dark", "light")
  })

  // jsdom has no stylesheet, so the token is set inline the way global.css would resolve it
  it("copies --background into both theme-color metas when the mode class changes", async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">' +
        '<meta name="theme-color" content="#0f1612" media="(prefers-color-scheme: dark)">',
    )
    const root = document.documentElement
    root.style.setProperty("--background", "#ffffff")
    render(<ThemeProvider>obsah</ThemeProvider>)

    root.style.setProperty("--background", "#0f1612")
    root.classList.add("dark")

    await waitFor(() => {
      expect(metas().map((meta) => meta.getAttribute("content"))).toEqual(["#0f1612", "#0f1612"])
    })
  })
})
