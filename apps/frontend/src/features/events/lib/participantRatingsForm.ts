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

/** The rows as the page opens: a saved rating is the participant's own, the rest „Jako všichni“. */
export function initialRows(
  participants: RatedParticipant[],
  common: CommonRating,
): ParticipantRow[] {
  return participants.map(({ id, name, rating, ratingDeleted: isDeleted }) => ({
    id,
    name,
    isDeleted,
    mode: rating ? "own" : "common",
    stars: rating?.stars ?? common.stars,
    comment: rating?.comment ?? "",
    isCommentOpen: Boolean(rating?.comment),
    isEdited: false,
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
