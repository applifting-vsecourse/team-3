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

/** Card facts: „Florbal · Praha 9 · 8 členů“ */
export const groupFacts = (group: {
  activity: { name: string }
  locality: { name: string }
  memberCount: number
}): string =>
  `${group.activity.name} · ${group.locality.name} · ${memberCountLabel(group.memberCount)}`
