import type { ParticipantRatingInput, RatedParticipant } from "@/features/events/api/ratingSchemas"

/** „Všem stejně“ (Figma D-05): the stars (5★ to start with) and one comment for everyone. */
export type CommonRating = { stars: number; comment: string }

/**
 * One participant on the organizer's page: „Jako všichni“ follows the common rating, `own` has
 * its own stars and maybe its own comment. A rating a superadmin deleted can't be given again.
 */
export type ParticipantRow = {
  id: string
  name: string
  isDeleted: boolean
  mode: "common" | "own"
  stars: number
  /** The participant's own comment; empty uses the common one. */
  comment: string
  isCommentOpen: boolean
  /** Changed on this page since it was loaded or saved. */
  isEdited: boolean
}

export const COMMON_START: CommonRating = { stars: 5, comment: "" }

/**
 * The page as it opens (review #322). The API keeps only each participant's own rating, never
 * „Všem stejně“, so the common rating is read back from what was saved: its comment is the one
 * most participants got (at least two; else none), its stars the most usual among them. Who got
 * both is „Jako všichni“ again — a new common comment reaches them — and the rest keep their own
 * stars and comment. Nothing saved yet: 5★ and no comment, everyone „Jako všichni“.
 */
export function initialForm(participants: RatedParticipant[]): {
  common: CommonRating
  rows: ParticipantRow[]
} {
  const rated = participants.flatMap(({ rating, ratingDeleted: isDeleted }) =>
    rating && !isDeleted ? [{ stars: rating.stars, comment: rating.comment ?? "" }] : [],
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
  const rows = participants.map(
    ({ id, name, rating, ratingDeleted: isDeleted }): ParticipantRow => {
      // the common comment isn't the participant's own: it follows „Komentář pro všechny“
      const ownComment = rating?.comment && rating.comment !== common.comment ? rating.comment : ""
      const isCommon = !rating || (ownComment === "" && rating.stars === common.stars)
      return {
        id,
        name,
        isDeleted,
        mode: isCommon ? "common" : "own",
        stars: rating?.stars ?? common.stars,
        comment: ownComment,
        isCommentOpen: ownComment !== "",
        isEdited: false,
      }
    },
  )
  return { common, rows }
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

/**
 * What PUT sends (B-060): each participant gets their own rating — never the common one as a
 * rating of the event — with their own comment, or else the common one. Deleted ones are left out.
 */
export function toInputs(rows: ParticipantRow[], common: CommonRating): ParticipantRatingInput[] {
  return rows
    .filter((row) => !row.isDeleted)
    .map((row) => {
      const own = row.mode === "own" ? row.comment.trim() : ""
      const comment = own || common.comment.trim()
      return { participantId: row.id, stars: effectiveStars(row, common), comment: comment || null }
    })
}

const starsWord = (stars: number): string =>
  stars === 1 ? "1 hvězda" : stars <= 4 ? `${stars} hvězdy` : `${stars} hvězd`

/** The row's second line (Figma D-05): „Jako všichni“, „Upraveno: 4 hvězdy a vlastní komentář“. */
export function rowDescription(row: ParticipantRow): string {
  if (row.isDeleted) return "Hodnocení odstranil správce"
  if (row.mode === "common") return "Jako všichni"
  const what = `${starsWord(row.stars)}${row.comment.trim() ? " a vlastní komentář" : ""}`
  return `${row.isEdited ? "Upraveno" : "Uloženo"}: ${what}`
}
