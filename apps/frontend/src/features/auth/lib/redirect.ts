import type { ParsedLocation } from "@tanstack/react-router"

export const encodeRedirectUri = (location: ParsedLocation) => encodeURIComponent(location.href)

// A path in this app: not `https://…`, not `//host` (protocol-relative), and
// no backslash or control character a browser could turn into either.
const isAppPath = (path: string) =>
  path.startsWith("/") && !path.startsWith("//") && !/[\\\p{Cc}]/u.test(path)

/**
 * Where to go back to after signing in or up (B-012): the page `from`
 * names, or `fallback`. Only a path in this app, so a crafted link
 * (`?from=https://evil.com`) can't send the user away.
 */
export const safeRedirect = (encoded: string | undefined, fallback: string): string => {
  if (!encoded) return fallback
  try {
    const path = decodeURIComponent(encoded)
    return isAppPath(path) ? path : fallback
  } catch {
    return fallback
  }
}
