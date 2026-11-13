import { describe, expect, it } from "vitest"

import {
  effectiveStars,
  initialRows,
  rowDescription,
  toInputs,
  type ParticipantRow,
} from "./participantRatingsForm"

const updatedAt = new Date("2026-11-01T08:00:00.000Z")
const common = { stars: 5, comment: "Díky za hru!" }

const participants = [
  { id: "u-jakub", name: "Jakub", rating: null, ratingDeleted: false },
  {
    id: "u-lucie",
    name: "Lucie",
    rating: { stars: 4, comment: "Skvělé nahrávky", updatedAt },
    ratingDeleted: false,
  },
  { id: "u-eliska", name: "Eliška", rating: null, ratingDeleted: true },
]

describe("the organizer's rating form (Figma D-05, #66)", () => {
  it("opens: a saved rating is the participant's own, the rest follow „Všem stejně“", () => {
    const rows = initialRows(participants, common)
    expect(rows.map((row) => [row.id, row.mode, effectiveStars(row, common)])).toEqual([
      ["u-jakub", "common", 5],
      ["u-lucie", "own", 4],
      ["u-eliska", "common", 5],
    ])
    expect(rows.map(rowDescription)).toEqual([
      "Jako všichni",
      "Uloženo: 4 hvězdy a vlastní komentář",
      "Hodnocení odstranil správce",
    ])
    // the saved comment is open to edit
    expect(rows[1]?.isCommentOpen).toBe(true)
  })

  it("sends each participant their own rating; the common comment where there is no own one", () => {
    const rows = initialRows(participants, common)
    expect(toInputs(rows, common)).toEqual([
      { participantId: "u-jakub", stars: 5, comment: "Díky za hru!" },
      { participantId: "u-lucie", stars: 4, comment: "Skvělé nahrávky" },
    ])
  })

  it("a common comment left empty is none; spaces don't count", () => {
    const rows = initialRows([participants[0]!], common)
    expect(toInputs(rows, { stars: 3, comment: "   " })).toEqual([
      { participantId: "u-jakub", stars: 3, comment: null },
    ])
  })

  it("„Upraveno“ names the stars in Czech", () => {
    const row: ParticipantRow = {
      id: "u",
      name: "U",
      isDeleted: false,
      mode: "own",
      stars: 1,
      comment: "",
      isCommentOpen: false,
      isEdited: true,
    }
    expect(rowDescription(row)).toBe("Upraveno: 1 hvězda")
    expect(rowDescription({ ...row, stars: 3 })).toBe("Upraveno: 3 hvězdy")
    expect(rowDescription({ ...row, stars: 5, comment: "Díky" })).toBe(
      "Upraveno: 5 hvězd a vlastní komentář",
    )
  })
})
