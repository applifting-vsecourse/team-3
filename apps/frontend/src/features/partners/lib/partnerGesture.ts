/**
 * The swipe's numbers (#84, brief › Swipe balíček), pure so they can be tested: the card turns
 * with the drag up to 15°, the stamp fades in until the threshold, and a release decides by
 * distance (30 % of the card's width) or by speed. The buttons and the arrow keys do the same
 * (WCAG 2.5.1, 2.5.7): the swipe is a shortcut, never the only way.
 */

export type SwipeDirection = "skip" | "request"

/** Under this the pointer only wobbles; no drag starts. */
export const DEAD_ZONE_PX = 8
const MAX_TILT_DEG = 15
const COMMIT_SHARE = 0.3
const FLICK_SPEED = 0.5 // px/ms
const FLICK_MIN_PX = 24
const FLING_MIN_MS = 180
const FLING_MAX_MS = 320
const FLING_MIN_SPEED = 1.2 // px/ms
/** A button or a key flies the card off with a fixed tilt and time. */
export const BUTTON_FLING = { tiltDeg: 12, durationMs: 320 } as const
export const FLING_TILT_DEG = 20
export const SPRING_BACK_MS = 420
/** Reduced motion: a crossfade instead of the flight. */
export const CROSSFADE_MS = 150

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const tiltDeg = (dx: number, width: number): number =>
  width > 0 ? clamp((dx / width) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG) : 0

/** How far along to a commit, 0 to 1: the stamps' opacity and the next card's growth. */
export const dragProgress = (dx: number, width: number): number =>
  width > 0 ? clamp(Math.abs(dx) / (COMMIT_SHARE * width), 0, 1) : 0

/**
 * Whether the pointer started a sideways drag (`drag`), a vertical scroll the page should keep
 * (`scroll`) or nothing yet.
 */
export function dragIntent(dx: number, dy: number): "drag" | "scroll" | undefined {
  if (Math.abs(dx) < DEAD_ZONE_PX && Math.abs(dy) < DEAD_ZONE_PX) return undefined
  return Math.abs(dx) >= Math.abs(dy) ? "drag" : "scroll"
}

/** Released: far enough, or flicked fast enough the same way; otherwise the card springs back. */
export function releaseDirection(
  dx: number,
  vx: number,
  width: number,
): SwipeDirection | undefined {
  const isFar = Math.abs(dx) > COMMIT_SHARE * width
  const isFlick =
    Math.abs(vx) > FLICK_SPEED && Math.abs(dx) > FLICK_MIN_PX && Math.sign(vx) === Math.sign(dx)
  if (!isFar && !isFlick) return undefined
  return dx > 0 ? "request" : "skip"
}

/** The flight off screen takes what is left of the way at the release's speed, 180–320 ms. */
export const flingDurationMs = (remainingPx: number, vx: number): number =>
  clamp(remainingPx / Math.max(Math.abs(vx), FLING_MIN_SPEED), FLING_MIN_MS, FLING_MAX_MS)
