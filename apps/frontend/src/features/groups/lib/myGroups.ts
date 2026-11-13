import { z } from "zod"

import { requestCountLabel, requestsWaitingLabel, waitVerb } from "@/lib/requestCount"

import type { GroupType, MyGroup } from "@/features/groups/api/groupSchemas"

/**
 * The chip in the URL, as Figma names the screens (C-04, C-05): `?tab=clen` is Jsem členem,
 * `?tab=spravuju` Spravuju. Without one (or with anything else) the page picks it itself.
 */
export const myGroupsSearchSchema = z.object({
  tab: z.enum(["clen", "spravuju"]).optional().catch(undefined),
})

export type MyGroupsSearch = z.infer<typeof myGroupsSearchSchema>
export type MyGroupsTabName = NonNullable<MyGroupsSearch["tab"]>

/**
 * Moje › Skupiny split as Moje › Akce (#304): Jsem členem holds my requests waiting for an
 * admin (as Přihlášen holds mine waiting for an organizer) and the groups I am a member of;
 * Spravuju the groups I run. The API sends them by name, my requests first.
 */
export function myGroupsSections(groups: MyGroup[]): {
  pending: MyGroup[]
  joined: MyGroup[]
  running: MyGroup[]
} {
  const active = groups.filter((group) => group.membership.status === "active")
  return {
    pending: groups.filter((group) => group.membership.status === "pending"),
    joined: active.filter((group) => group.membership.role === "member"),
    running: active.filter((group) => group.membership.role === "admin"),
  }
}

export type MyGroupsSections = ReturnType<typeof myGroupsSections>

/** Requests waiting in a group I run; none in any other (the API sends null there). */
const waitingRequests = (group: MyGroup): number => group.pendingRequests ?? 0

/**
 * The chip Moje › Skupiny opens on without `?tab`, as Moje › Akce does (#188): Spravuju while
 * requests wait there, or when I am in nothing and run something; otherwise Jsem členem.
 */
export function initialMyGroupsTab({
  pending,
  joined,
  running,
}: MyGroupsSections): MyGroupsTabName {
  if (running.some((group) => waitingRequests(group) > 0)) return "spravuju"
  return pending.length + joined.length === 0 && running.length > 0 ? "spravuju" : "clen"
}

/** The type on a card in Moje (Figma C-04, C-05): whether I am in is the section, not the line. */
export const MY_GROUP_TYPE: Record<GroupType, string> = {
  public: "Veřejná",
  closed: "Neveřejná",
}

/**
 * The facts on a card in Spravuju (Figma C-05): the requests to decide instead of the members,
 * as an event in Pořádám ends with „2 žádosti čekají“ — „Volejbal · Praha 7 · 1 žádost čeká“.
 * Undefined with none, and the card shows its usual facts.
 */
export function runningFacts(group: MyGroup): string | undefined {
  const requests = waitingRequests(group)
  if (requests === 0) return undefined
  return `${group.activity.name} · ${group.locality.name} · ${requestsWaitingLabel(requests)}`
}

/** „1 žádost o členství čeká“, „2 žádosti o členství čekají“ */
const membershipRequestsWaiting = (count: number): string =>
  `${requestCountLabel(count)} o členství ${waitVerb(count)}`

/**
 * The strip above Spravuju (Figma C-05), as above Pořádám: „1 žádost o členství čeká na
 * schválení“ and the groups they wait in, „Volejbal Praha 7 – po práci (1)“. Null with none.
 */
export function membershipRequestsSummary(
  groups: MyGroup[],
): { title: string; groups: string } | null {
  const waiting = groups.filter((group) => waitingRequests(group) > 0)
  const total = waiting.reduce((sum, group) => sum + waitingRequests(group), 0)
  if (total === 0) return null
  return {
    title: `${membershipRequestsWaiting(total)} na schválení`,
    groups: waiting.map((group) => `${group.name} (${waitingRequests(group)})`).join(", "),
  }
}

/** „1 tvoje žádost“, „2 tvoje žádosti“, „5 tvých žádostí“ */
const ownRequestsLabel = (count: number): string => {
  if (count === 1) return "1 tvoje žádost"
  if (count >= 2 && count <= 4) return `${count} tvoje žádosti`
  return `${count} tvých žádostí`
}

/** The band's line in Jsem členem (Figma C-04d): „… Na odpověď čeká 1 tvoje žádost.“ when any wait. */
export function memberLine(sections: MyGroupsSections | undefined): string {
  const line = "Skupiny, kde jsi členem."
  const waiting = sections?.pending.length ?? 0
  if (waiting === 0) return line
  return `${line} Na odpověď ${waitVerb(waiting)} ${ownRequestsLabel(waiting)}.`
}

/** The band's line in Spravuju (Figma C-05d): „… Na schválení čeká 1 žádost o členství.“ */
export function runningLine(groups: MyGroup[] | undefined): string {
  const line = "Skupiny, které spravuješ."
  const total = (groups ?? []).reduce((sum, group) => sum + waitingRequests(group), 0)
  if (total === 0) return line
  return `${line} Na schválení ${waitVerb(total)} ${requestCountLabel(total)} o členství.`
}
