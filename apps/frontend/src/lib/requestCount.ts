/** "1 žádost", "2 žádosti", "5 žádostí" */
export function requestCountLabel(count: number): string {
  if (count === 1) return "1 žádost"
  if (count >= 2 && count <= 4) return `${count} žádosti`
  return `${count} žádostí`
}

/** The verb after a number of requests: „1 žádost čeká“, „2 žádosti čekají“, „5 žádostí čeká“. */
export const waitVerb = (count: number): string => (count >= 2 && count <= 4 ? "čekají" : "čeká")

/**
 * „2 žádosti čekají“, „1 žádost čeká“, „5 žádostí čeká“ — on the cards and strips of Moje,
 * for an event's requests and a group's alike (#304).
 */
export const requestsWaitingLabel = (count: number): string =>
  `${requestCountLabel(count)} ${waitVerb(count)}`
