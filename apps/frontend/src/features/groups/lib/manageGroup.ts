import type { GroupType } from "@/features/groups/api/groupSchemas"

/** The one thing the group's management offers first (Figma D-07, D-07d, #371). */
export type GroupNextStep = { action: "decide" | "invite" | "write"; text: string }

/** „Čeká 1 žádost“, „Čekají 3 žádosti“, „Čeká 5 žádostí“. */
function waitingRequests(count: number): string {
  if (count === 1) return "Čeká 1 žádost"
  return count <= 4 ? `Čekají ${count} žádosti` : `Čeká ${count} žádostí`
}

/**
 * What the admin should do next (#371): decide the waiting requests — no button of its own,
 * they are decided in the list —, invite people while the admin is alone, or else write to
 * the members. `memberCount` counts the admins too.
 */
export function groupNextStep(requestCount: number, memberCount: number): GroupNextStep {
  if (requestCount > 0) {
    return {
      action: "decide",
      // „ji“ for one request, „je“ for more
      text: `${waitingRequests(requestCount)} o členství. Schval ${requestCount === 1 ? "ji" : "je"}, nebo zamítni v seznamu Žádosti.`,
    }
  }
  if (memberCount <= 1) {
    return {
      action: "invite",
      text: "Ve skupině jsi zatím jen ty. Pošli odkaz lidem, se kterými hraješ.",
    }
  }
  return { action: "write", text: "Napiš členům, co chystáte." }
}

/** „Jak to půjde dál“ while the admin is alone and nobody asks (Figma D-07d – jen ty, #371). */
export function groupEmptySteps(type: GroupType): string[] {
  return [
    "Pošli odkaz na skupinu – v chatu party nebo na sítích.",
    type === "closed"
      ? "Neveřejná skupina: každá žádost o členství se objeví tady a schválíš ji."
      : "Kdo se ke skupině přidá, objeví se tady mezi členy.",
    "Akce jen pro členy založíš na stránce skupiny („Založit akci skupiny“).",
    "Až budou ve skupině další, „Napsat členům“ jim pošle zprávu všem najednou.",
  ]
}
