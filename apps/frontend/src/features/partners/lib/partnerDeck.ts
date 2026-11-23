import type { Partner } from "@/features/partners/api/partnersSchemas"

/** The next page is asked for while this many cards are left, so nobody waits between cards. */
export const PREFETCH_WHEN_LEFT = 5
/** „Dnes ještě 5 přidání“ shows from here down. */
export const REQUESTS_LEFT_SHOWN = 5
/** At most this many interest chips on a card, then „+2“. */
export const CHIPS_SHOWN = 5

/**
 * What the deck did with the cards of this visit (#84). The cards themselves come from the
 * pages; this only says which are done, which came back to the top and which skip „Vrátit“
 * can undo — only the last „Teď ne“, as Bumble's Backtrack and Tinder's Rewind do.
 */
export type DeckState = {
  done: ReadonlySet<string>
  /** Back on top: an undone skip or a failed action, also when a refetch dropped them. */
  returned: readonly Partner[]
  /** The last „Teď ne“, while „Vrátit“ can still bring it back. */
  undoable: Partner | null
}

export type DeckAction =
  | { type: "skip"; partner: Partner }
  | { type: "request"; partner: Partner }
  | { type: "undo" }
  | { type: "failed"; partner: Partner }

export const emptyDeck = (): DeckState => ({ done: new Set(), returned: [], undoable: null })

const without = (partners: readonly Partner[], id: string) =>
  partners.filter((partner) => partner.id !== id)

export function moveDeck(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case "skip":
    case "request": {
      const done = new Set(state.done).add(action.partner.id)
      return {
        done,
        returned: without(state.returned, action.partner.id),
        // „Přidat“ isn't undone (the request is sent with its notification) and ends the undo
        undoable: action.type === "skip" ? action.partner : null,
      }
    }
    case "undo": {
      if (!state.undoable) return state
      return comeBack(state, state.undoable, null)
    }
    case "failed":
      return comeBack(
        state,
        action.partner,
        state.undoable?.id === action.partner.id ? null : state.undoable,
      )
  }
}

function comeBack(state: DeckState, partner: Partner, undoable: Partner | null): DeckState {
  const done = new Set(state.done)
  done.delete(partner.id)
  return { done, returned: [partner, ...without(state.returned, partner.id)], undoable }
}

/** The cards still to go, the top one first: what came back, then the pages in their order. */
export function deckQueue(pages: readonly Partner[], state: DeckState): Partner[] {
  const seen = new Set(state.returned.map(({ id }) => id))
  const queue = [...state.returned]
  for (const partner of pages) {
    if (seen.has(partner.id) || state.done.has(partner.id)) continue
    seen.add(partner.id)
    queue.push(partner)
  }
  return queue
}

/** The band as a card says it; the distance is between the centres of the home localities. */
export function distanceLabel(bandKm: number): string {
  if (bandKm <= 2) return "do 2 km"
  if (bandKm >= 50) return "do 50 km"
  return `asi ${bandKm} km`
}

const plural = (count: number, one: string, few: string, many: string) =>
  count === 1 ? one : count >= 2 && count <= 4 ? few : many

/** „2 společné zájmy“ */
export function sharedInterestsLabel(count: number): string {
  return `${count} ${plural(count, "společný zájem", "společné zájmy", "společných zájmů")}`
}

/** „Dnes ještě 5 přidání.“ — only from five down, never at zero (then the button explains). */
export function requestsLeftLabel(left: number): string | undefined {
  return left > 0 && left <= REQUESTS_LEFT_SHOWN ? `Dnes ještě ${left} přidání.` : undefined
}

export const DAILY_LIMIT_REACHED = "Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra."

/** Who comes next, for the live region: name, distance, what we share. */
const nextOne = (next: Partner | undefined) =>
  next
    ? ` Další: ${next.name}, ${distanceLabel(next.distanceBandKm)}, ${sharedInterestsLabel(next.sharedInterests.length)}.`
    : " Další lidi v okolí teď nejsou."

/**
 * The live region after each action (WCAG 4.1.3): what happened and who is next, so a screen
 * reader user never needs to move focus off the button they pressed. Present tense and no
 * gender (DESIGN.md › Copy).
 */
export function announce(
  kind: "skip" | "request" | "undo" | "match",
  partner: Partner,
  next: Partner | undefined,
): string {
  switch (kind) {
    case "skip":
      return `Přeskočeno.${nextOne(next)}`
    case "request":
      return `Žádost odeslána: ${partner.name}.${nextOne(next)}`
    case "undo":
      return `Vráceno: ${partner.name}.`
    case "match":
      return `Je to shoda: ${partner.name}.`
  }
}
