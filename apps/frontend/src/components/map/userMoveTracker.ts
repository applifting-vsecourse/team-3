/**
 * How long after the user's own wheel, key or tap a move that starts still counts as theirs:
 * Leaflet debounces the wheel (40 ms) and a tap on a cluster starts a flight right away.
 */
const INPUT_WINDOW_MS = 500

/**
 * Tells the user's moves of the map from the map fitting itself (#56: „Hledat v této oblasti“
 * only after the user moved the map). A move is the user's when it *starts* while a pointer is
 * down or just after their input; a tap that moves nothing leaves nothing behind, so a later
 * fit to new pins never counts as theirs.
 */
export function createUserMoveTracker(now: () => number = () => performance.now()) {
  let pointersDown = 0
  let lastInputAt = Number.NEGATIVE_INFINITY
  let isUserMove = false

  return {
    /** wheel, key, or the end of a tap */
    input: () => {
      lastInputAt = now()
    },
    pointerDown: () => {
      pointersDown += 1
      lastInputAt = now()
    },
    pointerUp: () => {
      pointersDown = Math.max(0, pointersDown - 1)
      lastInputAt = now()
    },
    moveStart: () => {
      // a drag's inertia or a flight keeps the flag from its start to its end
      isUserMove ||= pointersDown > 0 || now() - lastInputAt < INPUT_WINDOW_MS
    },
    /** true when the move that just ended was the user's */
    moveEnd: (): boolean => {
      const didUserMove = isUserMove
      isUserMove = false
      return didUserMove
    },
  }
}
