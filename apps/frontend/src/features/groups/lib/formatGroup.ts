import type { GroupType } from "@/features/groups/api/groupSchemas"

/** "1 člen", "3 členové", "5 členů" — approved members only. */
export function memberCountLabel(count: number): string {
  if (count === 1) return "1 člen"
  if (count >= 2 && count <= 4) return `${count} členové`
  return `${count} členů`
}

/** "1 skupina", "3 skupiny", "9 skupin" */
export function groupCountLabel(count: number): string {
  if (count === 1) return "1 skupina"
  if (count >= 2 && count <= 4) return `${count} skupiny`
  return `${count} skupin`
}

/**
 * Button of a filter panel: "Zobrazit 1 skupinu", "Zobrazit 3 skupiny", "Zobrazit 9 skupin";
 * "Zobrazit skupiny" until the count for the current choice is known.
 */
export function showGroupsLabel(count: number | undefined): string {
  if (count === undefined) return "Zobrazit skupiny"
  if (count === 1) return "Zobrazit 1 skupinu"
  if (count >= 2 && count <= 4) return `Zobrazit ${count} skupiny`
  return `Zobrazit ${count} skupin`
}

/** On a card (Figma: Group card/List). */
export const GROUP_TYPE_SHORT: Record<GroupType, string> = {
  public: "Veřejná",
  closed: "Neveřejná – žádost o členství",
}

/** On the group page and in the form (Figma A-08, D-06). */
export const GROUP_TYPE_LONG: Record<GroupType, string> = {
  public: "Veřejná – kdokoli se přidá jedním klepnutím",
  closed: "Neveřejná – správce schvaluje žádosti",
}

/** In the management, addressed to the admin (Figma D-07d). */
export const GROUP_TYPE_FOR_ADMIN: Record<GroupType, string> = {
  public: "Veřejná – kdokoli se přidá jedním klepnutím",
  closed: "Neveřejná – žádosti schvaluješ ty",
}

/**
 * „Moje“ (Figma A-07m): the type line, or that my request waits. Whether I
 * run the group or am a member is the section it is in (Spravuju / Jsem členem).
 */
export function myGroupTypeLabel(group: {
  type: GroupType
  membership: { status: "active" | "pending" }
}): string {
  if (group.membership.status === "pending") return "Neveřejná – žádost čeká na schválení"
  return GROUP_TYPE_SHORT[group.type]
}

/** Card facts: „Florbal · Praha 9 · 8 členů“ */
export const groupFacts = (group: {
  activity: { name: string }
  locality: { name: string }
  memberCount: number
}): string =>
  `${group.activity.name} · ${group.locality.name} · ${memberCountLabel(group.memberCount)}`

/** In the band of the group page and its management (Figma A-08d, D-07d). */
export const GROUP_TYPE_IN_BAND: Record<GroupType, string> = {
  public: "Veřejná skupina",
  closed: "Neveřejná skupina",
}

/** The band's line: „Neveřejná skupina · Praha 2 · 5 členů“ (A-08d). */
export const groupBandLine = (group: {
  type: GroupType
  locality: { name: string }
  memberCount: number
}): string =>
  [GROUP_TYPE_IN_BAND[group.type], group.locality.name, memberCountLabel(group.memberCount)].join(
    " · ",
  )

const announcementTimeFormat = new Intl.DateTimeFormat("cs-CZ", {
  // a group meets in Prague, so its announcements are in Prague time wherever the browser is
  timeZone: "Europe/Prague",
  weekday: "short",
  day: "numeric",
  month: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/** When an announcement was sent (Figma A-08e): "čt 22. 10. v 20:10". */
export function formatAnnouncementTime(date: Date): string {
  const parts = announcementTimeFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("weekday")} ${get("day")}. ${get("month")}. v ${get("hour")}:${get("minute")}`
}

/**
 * Who gets an announcement (Figma D-08): every active member, the admin
 * writing it included (`memberCount`).
 */
export function announcementRecipientsLabel(memberCount: number): string {
  if (memberCount <= 1) {
    return "Ve skupině zatím nikdo další není. E-mail přijde jen tobě a oznámení zůstane na stránce skupiny pro nové členy."
  }
  return `Oznámení přijde e-mailem všem ${memberCount} aktivním členům a uvidí ho na stránce skupiny. Čekající žadatelé ho nedostanou.`
}

/** Under the text (Figma D-08): what is left of today's limit; „oznámení“ is the same in every count. */
export function remainingAnnouncementsLabel(remaining: number): string {
  if (remaining <= 0) return "Dnes už skupině další oznámení poslat nemůžeš. Zkus to zítra."
  return `Dnes můžeš skupině poslat ještě ${remaining} oznámení.`
}
