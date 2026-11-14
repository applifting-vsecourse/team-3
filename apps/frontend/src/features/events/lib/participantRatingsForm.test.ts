import { describe, expect, it } from "vitest"

import {
  effectiveStars,
  initialForm,
  reconcileRows,
  rowDescription,
  savedRows,
  snapshotKey,
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

const rated = (stars: number, comment: string | null) => ({ stars, comment, updatedAt })
const person = (id: string, rating: ReturnType<typeof rated> | null, isDeleted = false) => ({
  id,
  name: id,
  rating,
  ratingDeleted: isDeleted,
})

describe("the organizer's rating form (Figma D-05, #66)", () => {
  it("nothing saved yet: 5★, no comment, everyone „Jako všichni“", () => {
    const { common, rows } = initialForm([person("a", null), person("b", null)])
    expect(common).toEqual({ stars: 5, comment: "" })
    expect(rows.map(rowDescription)).toEqual(["Jako všichni", "Jako všichni"])
  })

  it("opens with „Všem stejně“ read back from what was saved (review #322)", () => {
    const { common, rows } = initialForm([
      person("jakub", rated(4, "Díky za hru!")),
      person("lucie", rated(5, "Skvělé nahrávky")),
      person("martin", rated(4, "Díky za hru!")),
      // the common comment, own stars
      person("petr", rated(2, "Díky za hru!")),
      person("eliska", null, true),
      person("nova", null),
    ])
    expect(common).toEqual({ stars: 4, comment: "Díky za hru!" })
    expect(rows.map((row) => [row.id, row.mode, effectiveStars(row, common), row.comment])).toEqual(
      [
        ["jakub", "common", 4, ""],
        ["lucie", "own", 5, "Skvělé nahrávky"],
        ["martin", "common", 4, ""],
        ["petr", "own", 2, ""],
        ["eliska", "common", 4, ""],
        ["nova", "common", 4, ""],
      ],
    )
    expect(rows.map(rowDescription)).toEqual([
      "Jako všichni",
      "Uloženo: 5 hvězd a vlastní komentář",
      "Jako všichni",
      "Uloženo: 2 hvězdy",
      "Hodnocení odstranil správce",
      "Jako všichni",
    ])
    // only an own comment is open to edit
    expect(rows.map((row) => row.isCommentOpen)).toEqual([false, true, false, false, false, false])
  })

  it("a new common comment reaches everyone without their own one, after coming back too", () => {
    const { common, rows } = initialForm([
      person("jakub", rated(4, "Díky za hru!")),
      person("lucie", rated(5, "Skvělé nahrávky")),
      person("martin", rated(4, "Díky za hru!")),
      person("petr", rated(2, "Díky za hru!")),
    ])
    expect(toInputs(rows, { ...common, comment: "Díky, příště zase!" })).toEqual([
      { participantId: "jakub", stars: 4, comment: "Díky, příště zase!" },
      { participantId: "lucie", stars: 5, comment: "Skvělé nahrávky" },
      { participantId: "martin", stars: 4, comment: "Díky, příště zase!" },
      { participantId: "petr", stars: 2, comment: "Díky, příště zase!" },
    ])
  })

  it("one comment only one got is theirs, not a common one", () => {
    const { common, rows } = initialForm([
      person("jakub", rated(5, "Super smeče")),
      person("lucie", rated(5, null)),
    ])
    expect(common).toEqual({ stars: 5, comment: "" })
    expect(rows.map(rowDescription)).toEqual([
      "Uloženo: 5 hvězd a vlastní komentář",
      "Jako všichni",
    ])
  })

  it("sends each participant their own rating; the common comment where there is no own one", () => {
    const { rows } = initialForm(participants)
    expect(toInputs(rows, common)).toEqual([
      { participantId: "u-jakub", stars: 5, comment: "Díky za hru!" },
      { participantId: "u-lucie", stars: 4, comment: "Skvělé nahrávky" },
    ])
  })

  it("a common comment left empty is none; spaces don't count", () => {
    const { rows } = initialForm([participants[0]!])
    expect(toInputs(rows, { stars: 3, comment: "   " })).toEqual([
      { participantId: "u-jakub", stars: 3, comment: null },
    ])
  })

  it("after saving the rows stay as they were, only no longer „Upraveno“", () => {
    const { rows } = initialForm(participants)
    const edited = rows.map((row) => ({ ...row, isEdited: true }))
    const saved = savedRows(edited, participants)
    expect(saved.map((row) => [row.mode, row.isEdited])).toEqual([
      ["common", false],
      ["own", false],
      ["common", false],
    ])
  })

  it("a rating saved without a comment never gets the common one (review #322)", () => {
    // A and B got the common „Super“, C the same stars and no comment
    const { common, rows } = initialForm([
      person("a", rated(4, "Super")),
      person("b", rated(4, "Super")),
      person("c", rated(4, null)),
    ])
    expect(common).toEqual({ stars: 4, comment: "Super" })
    expect(rows.map(rowDescription)).toEqual([
      "Jako všichni",
      "Jako všichni",
      "Uloženo: 4 hvězdy bez komentáře",
    ])
    // the organizer changes only A and saves: C stays without a comment
    const edited = rows.map((row) =>
      row.id === "a" ? { ...row, mode: "own" as const, stars: 5, isEdited: true } : row,
    )
    expect(toInputs(edited, common)).toEqual([
      { participantId: "a", stars: 5, comment: "Super" },
      { participantId: "b", stars: 4, comment: "Super" },
      { participantId: "c", stars: 4, comment: null },
    ])
  })

  it("a participant the API refused isn't sent again", () => {
    const { rows } = initialForm(participants)
    const refused = rows.map((row) => (row.id === "u-jakub" ? { ...row, isLeftOut: true } : row))
    expect(toInputs(refused, common).map((input) => input.participantId)).toEqual(["u-lucie"])
    expect(rowDescription(refused[0]!)).toBe("Neuloží se")
  })

  it("a fresh list: untouched rows show what is saved now, edits stay, who left goes", () => {
    const { rows } = initialForm(participants)
    const edited = rows.map((row) =>
      row.id === "u-jakub" ? { ...row, mode: "own" as const, stars: 2, isEdited: true } : row,
    )
    const fresh = [
      { ...participants[0]!, rating: rated(3, null) },
      { ...participants[1]!, rating: rated(5, "Jiný tab") },
    ]
    expect(snapshotKey(fresh)).not.toBe(snapshotKey(participants))
    const next = reconcileRows(edited, fresh, common)
    expect(next.map((row) => [row.id, row.stars, row.comment, row.isEdited])).toEqual([
      ["u-jakub", 2, "", true],
      ["u-lucie", 5, "Jiný tab", false],
    ])
  })

  it.each([
    ["a space", "Super akce! "],
    ["a new line", "Super akce!\n"],
  ])("a common comment ending with %s is the one saved trimmed (re-review #322)", (_end, typed) => {
    const common = { stars: 4, comment: typed }
    // what toInputs sent for it, read back after the save
    const saved = toInputs(initialForm([person("a", null), person("b", null)]).rows, common)
    expect(saved.map((input) => input.comment)).toEqual(["Super akce!", "Super akce!"])
    const fresh = saved.map((input) =>
      person(input.participantId, rated(input.stars, input.comment)),
    )

    // the fresh list after the save: still „Jako všichni“, the next common comment reaches them
    const rows = reconcileRows([], fresh, common)
    expect(rows.map(rowDescription)).toEqual(["Jako všichni", "Jako všichni"])
    expect(
      toInputs(rows, { ...common, comment: "Příště zase" }).map((input) => input.comment),
    ).toEqual(["Příště zase", "Příště zase"])
    // and when coming back
    expect(initialForm(fresh).rows.map(rowDescription)).toEqual(["Jako všichni", "Jako všichni"])
  })

  it("left out after a refusal, still on the list read again: rated again (re-review #322)", () => {
    const { rows } = initialForm(participants)
    const refused = rows.map((row) =>
      row.id === "u-jakub" ? { ...row, isLeftOut: true, isEdited: true } : row,
    )
    const [jakub] = reconcileRows(refused, participants, common)
    expect(jakub?.isLeftOut).toBe(false)
    expect(
      toInputs(reconcileRows(refused, participants, common), common).map(
        (input) => input.participantId,
      ),
    ).toContain("u-jakub")
    // a rating deleted meanwhile stays out, as deleted
    const deleted = reconcileRows(
      refused,
      participants.map((one) => (one.id === "u-jakub" ? { ...one, ratingDeleted: true } : one)),
      common,
    )
    expect(rowDescription(deleted[0]!)).toBe("Hodnocení odstranil správce")
    expect(toInputs(deleted, common).map((input) => input.participantId)).not.toContain("u-jakub")
  })

  it("„Upraveno“ names the stars in Czech", () => {
    const row: ParticipantRow = {
      id: "u",
      name: "U",
      isDeleted: false,
      isLeftOut: false,
      mode: "own",
      stars: 1,
      comment: "",
      isCommentOwn: false,
      isCommentOpen: false,
      isEdited: true,
    }
    expect(rowDescription(row)).toBe("Upraveno: 1 hvězda")
    expect(rowDescription({ ...row, stars: 3 })).toBe("Upraveno: 3 hvězdy")
    expect(rowDescription({ ...row, stars: 5, comment: "Díky", isCommentOwn: true })).toBe(
      "Upraveno: 5 hvězd a vlastní komentář",
    )
    expect(rowDescription({ ...row, stars: 4, isCommentOwn: true })).toBe(
      "Upraveno: 4 hvězdy bez komentáře",
    )
  })
})
