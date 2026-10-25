import { ROUTES } from "@/app/routes"

export type NavSection = "events" | "groups" | "myEvents" | "profile" | "login"

/**
 * Which navigation item a page belongs to. The router's own active state
 * matches by path prefix, which would put everything under /akce in Akce;
 * but creating, editing and managing an event start from Moje akce
 * (Figma D-03d, DESIGN.md › Založit akci), so those belong there. The event
 * detail stays in Akce wherever it was opened from (A-05).
 */
export function navSection(pathname: string): NavSection | null {
  const segments = pathname.split("/").filter(Boolean)
  const [first] = segments
  const path = `/${first ?? ""}`

  if (path === ROUTES.events) {
    const isOwnEventPage = segments[1] === "nova" || segments.length > 2
    return isOwnEventPage ? "myEvents" : "events"
  }
  if (path === ROUTES.myEvents) return "myEvents"
  if (path === ROUTES.groups) return "groups"
  if (path === ROUTES.profile) return "profile"
  if (path === ROUTES.login) return "login"
  return null
}
