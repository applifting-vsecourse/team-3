import { ROUTES } from "@/app/routes"

export type NavSection = "events" | "groups" | "my" | "profile" | "login"

/**
 * Which navigation item a page belongs to. The router's own active state
 * matches by path prefix, which would put everything under /akce in Akce;
 * but creating, editing and managing an event start from Moje (Figma D-03d,
 * DESIGN.md › Založit akci), so those belong there — and since #304 the same
 * for a group: founding, editing and managing it, and creating its event. The
 * event's detail stays in Akce and the group's page in Skupiny, wherever they
 * were opened from (A-05, A-08).
 */
export function navSection(pathname: string): NavSection | null {
  const segments = pathname.split("/").filter(Boolean)
  const [first] = segments
  const path = `/${first ?? ""}`
  // /akce/nova, /akce/:id/upravit…; /skupiny/nova, /skupiny/:id/sprava…
  const isOwnPage = segments[1] === "nova" || segments.length > 2

  if (path === ROUTES.events) return isOwnPage ? "my" : "events"
  if (path === ROUTES.groups) return isOwnPage ? "my" : "groups"
  if (path === "/moje" || path === "/moje-akce") return "my"
  if (path === ROUTES.profile) return "profile"
  if (path === ROUTES.login) return "login"
  return null
}
