import { useEffect, type ReactNode } from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}

/**
 * index.html's theme-color metas follow the system setting via media queries, which is
 * right on first paint but not after a manual switch. This keeps the browser chrome on
 * --background: it watches <html>'s class (next-themes sets .dark there) and copies the
 * token into both metas, so no colour is hardcoded here.
 */
function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      const color = getComputedStyle(root).getPropertyValue("--background").trim()
      if (!color) return
      for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
        meta.setAttribute("content", color)
      }
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return null
}

export const useTheme = useNextTheme
