import type { ParticipantRatingInput, RatedParticipant } from "@/features/events/api/ratingSchemas"

/** „Všem stejně“ (Figma D-05): the stars (5★ to start with) and one comment for everyone. */
export type CommonRating = { stars: number; comment: string }

/**
 * One participant on the organizer's page: „Jako všichni“ follows the common rating, `own` has
 * its own stars, and its own comment when `isCommentOwn` — an empty one then means none, never
 * the common one (review #322). A rating a superadmin deleted can't be given again; one the API
 * refused for this participant (`isLeftOut`) isn't sent until the list is read again — still on
 * it and not deleted, they are rated again (re-review #322).
 */
export type ParticipantRow = {
  id: string
  name: string
  isDeleted: boolean
  isLeftOut: boolean
  mode: "common" | "own"
  stars: number
  comment: string
  isCommentOwn: boolean
  isCommentOpen: boolean
  /** Changed on this page since it was loaded or saved. */
  isEdited: boolean
}

export const COMMON_START: CommonRating = { stars: 5, comment: "" }

/**
 * A comment as it is sent and saved: trimmed, none when empty (toInputs). Every comparison of
 * comments goes through it, so „Super akce!\n“ typed is the „Super akce!“ saved (re-review #322).
 */
const asSaved = (comment: string | null | undefined): string => (comment ?? "").trim()

/**
 * The row of a participant as saved, against the common rating: „Jako všichni“ only with exactly
 * its stars and its comment (review #322) — a rating saved without a comment stays without one.
 */
function rowOf(
  { id, name, rating, ratingDeleted: isDeleted }: RatedParticipant,
  common: CommonRating,
): ParticipantRow {
  const saved = asSaved(rating?.comment)
  const commonComment = asSaved(common.comment)
  const isCommon = !rating || (saved === commonComment && rating.stars === common.stars)
  const isCommentOwn = !isCommon && saved !== commonComment
  return {
    id,
    name,
    isDeleted,
    isLeftOut: false,
    mode: isCommon ? "common" : "own",
    stars: rating?.stars ?? common.stars,
    comment: isCommentOwn ? saved : "",
    isCommentOwn,
    isCommentOpen: isCommentOwn && saved !== "",
    isEdited: false,
  }
}

/**
 * The page as it opens (review #322). The API keeps only each participant's own rating, never
 * „Všem stejně“, so the common rating is read back from what was saved: its comment is the one
 * most participants got (at least two; else none), its stars the most usual among them. Who got
 * exactly both is „Jako všichni“ again — a new common comment reaches them — and the rest keep
 * their own stars and comment. Nothing saved yet: 5★ and no comment, everyone „Jako všichni“.
 */
export function initialForm(participants: RatedParticipant[]): {
  common: CommonRating
  rows: ParticipantRow[]
} {
  const rated = participants.flatMap(({ rating, ratingDeleted: isDeleted }) =>
    rating && !isDeleted ? [{ stars: rating.stars, comment: asSaved(rating.comment) }] : [],
  )
  const commonComment = mostUsual(
    rated.map(({ comment }) => comment).filter(Boolean),
    (count) => count >= 2,
  )
  const commonStars = mostUsual(
    rated.filter(({ comment }) => comment === (commonComment ?? "")).map(({ stars }) => stars),
    () => true,
  )
  const common = {
    stars: commonStars ?? COMMON_START.stars,
    comment: commonComment ?? COMMON_START.comment,
  }
  return { common, rows: participants.map((participant) => rowOf(participant, common)) }
}

/** The value most of them have (the first one on a tie), if it passes `isEnough`. */
function mostUsual<T>(values: T[], isEnough: (count: number) => boolean): T | undefined {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best: T | undefined
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best !== undefined && isEnough(bestCount) ? best : undefined
}

/** What the list says about the ratings: changes when anyone saves, here or in another tab. */
export function snapshotKey(participants: RatedParticipant[]): string {
  return participants
    .map(
      ({ id, rating, ratingDeleted: isDeleted }) =>
        `${id}:${rating?.updatedAt.toISOString() ?? "-"}:${isDeleted ? "x" : ""}`,
    )
    .join("|")
}

/**
 * A fresh list from the server — another tab saved, or the API refused someone and the list was
 * read again (review #322): who isn't on it any more goes, a deleted rating shows so, and every
 * row the organizer hasn't touched shows what is saved now. Their own edits stay; one left out
 * after a refusal who is still on the list is in again (a deleted rating stays out as deleted).
 */
export function reconcileRows(
  rows: ParticipantRow[],
  participants: RatedParticipant[],
  common: CommonRating,
): ParticipantRow[] {
  return participants.map((participant) => {
    const current = rows.find((row) => row.id === participant.id)
    if (!current?.isEdited) return rowOf(participant, common)
    return {
      ...current,
      name: participant.name,
      isDeleted: participant.ratingDeleted,
      isLeftOut: false,
    }
  })
}

/**
 * After saving (review #322): the rows stay as the organizer left them — „Jako všichni“ keeps
 * following the common rating — only no longer „Upraveno“; a rating deleted meanwhile shows so.
 */
export function savedRows(rows: ParticipantRow[], saved: RatedParticipant[]): ParticipantRow[] {
  const deleted = new Set(saved.filter((one) => one.ratingDeleted).map((one) => one.id))
  return rows.map((row) => ({
    ...row,
    isEdited: false,
    isDeleted: row.isDeleted || deleted.has(row.id),
  }))
}

export const effectiveStars = (row: ParticipantRow, common: CommonRating): number =>
  row.mode === "common" ? common.stars : row.stars

const isSent = (row: ParticipantRow) => !row.isDeleted && !row.isLeftOut

/**
 * What PUT sends (B-060): each participant gets their own rating — never the common one as a
 * rating of the event — with their own comment, or else the common one. Deleted and refused ones
 * are left out.
 */
export function toInputs(rows: ParticipantRow[], common: CommonRating): ParticipantRatingInput[] {
  return rows.filter(isSent).map((row) => {
    const comment = asSaved(row.mode === "own" && row.isCommentOwn ? row.comment : common.comment)
    return { participantId: row.id, stars: effectiveStars(row, common), comment: comment || null }
  })
}

const starsWord = (stars: number): string =>
  stars === 1 ? "1 hvězda" : stars <= 4 ? `${stars} hvězdy` : `${stars} hvězd`

/** The row's second line (Figma D-05): „Jako všichni“, „Upraveno: 4 hvězdy a vlastní komentář“. */
export function rowDescription(row: ParticipantRow): string {
  if (row.isDeleted) return "Hodnocení odstranil správce"
  if (row.isLeftOut) return "Neuloží se"
  if (row.mode === "common") return "Jako všichni"
  const comment = !row.isCommentOwn
    ? ""
    : row.comment.trim()
      ? " a vlastní komentář"
      : " bez komentáře"
  return `${row.isEdited ? "Upraveno" : "Uloženo"}: ${starsWord(row.stars)}${comment}`
}
