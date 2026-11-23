import { afterEach, describe, expect, it } from "vitest"

import {
  answerInvite,
  inviteCodeFromPath,
  inviteShareText,
  joinedLine,
  pendingInvite,
  rememberInvite,
} from "./invite"

const CODE = "q3Zr1hXkE0bLw9yT2vNcAa"
const OTHER = "AQEBAQEBAQEBAQEBAQEBAQ"
const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 10, 23)

afterEach(() => localStorage.clear())

describe("inviteCodeFromPath (#406)", () => {
  it("reads the code of an invite path", () => {
    expect(inviteCodeFromPath(`/pozvanka/${CODE}`)).toBe(CODE)
    expect(inviteCodeFromPath(`/pozvanka/${CODE}/?x=1`)).toBe(CODE)
  })

  it.each([undefined, "/akce", "/pozvanka/kratky", `/pozvanka/${CODE}/dalsi`])(
    "ignores %p",
    (path) => {
      expect(inviteCodeFromPath(path)).toBeNull()
    },
  )
})

describe("pendingInvite (#406)", () => {
  it("takes the code from `from` even without storage (another browser)", () => {
    expect(pendingInvite(`/pozvanka/${CODE}`, now)).toBe(CODE)
  })

  it("takes the remembered code for 30 days", () => {
    rememberInvite(CODE, now)
    expect(pendingInvite("/akce", now + 30 * DAY)).toBe(CODE)
    expect(pendingInvite("/akce", now + 31 * DAY)).toBeNull()
  })

  it("prefers this sign-up's own link to an older remembered one", () => {
    rememberInvite(OTHER, now)
    expect(pendingInvite(`/pozvanka/${CODE}`, now)).toBe(CODE)
  })

  it("doesn't ask again once answered, also when the link is passed through again", () => {
    rememberInvite(CODE, now)
    answerInvite(CODE, now)
    expect(pendingInvite(`/pozvanka/${CODE}`, now)).toBeNull()
    rememberInvite(CODE, now)
    expect(pendingInvite(undefined, now)).toBeNull()
  })

  it("another friend's link is a new invite", () => {
    rememberInvite(CODE, now)
    answerInvite(CODE, now)
    rememberInvite(OTHER, now)
    expect(pendingInvite(undefined, now)).toBe(OTHER)
  })

  it("survives garbage in the storage", () => {
    localStorage.setItem("hobbyhub.invite", "{nope")
    expect(pendingInvite(undefined, now)).toBeNull()
  })
})

describe("inviteShareText (#406)", () => {
  it("names up to two interests in lower case", () => {
    expect(inviteShareText(["Volejbal", "Deskové hry", "Běh"])).toBe(
      "Hledám parťáky na volejbal a deskové hry. Pojď na HobbyHub, ať máme s kým vyrazit.",
    )
  })

  it("has a general message without interests", () => {
    expect(inviteShareText([])).toBe(
      "Jsem na HobbyHubu, kde se dají najít akce a lidi na koníčky. Přidej se.",
    )
  })
})

describe("joinedLine (#406)", () => {
  it.each([
    [1, "Přes tvůj odkaz se přidal 1 člověk."],
    [3, "Přes tvůj odkaz se přidali 3 lidé."],
    [5, "Přes tvůj odkaz se přidalo 5 lidí."],
  ])("%i", (count, line) => {
    expect(joinedLine(count)).toBe(line)
  })
})
