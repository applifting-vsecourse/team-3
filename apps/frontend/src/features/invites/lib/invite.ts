import { inSentence } from "@/lib/inSentence"

/**
 * Pozvánka od kamaráda (#406): the code from `/pozvanka/{kód}` travels through the sign-up two
 * ways. In the address (`from=/pozvanka/{kód}`), which the verification e-mail and Google bring
 * back even in another browser, and in this browser's storage for 30 days, which survives
 * wandering off before signing up. Either may be missing: then the invite is simply not shown.
 */

const KEY = "hobbyhub.invite"
const KEPT_MS = 30 * 24 * 60 * 60 * 1000
// the backend's INVITE_CODE_PATTERN: 16 random bytes as base64url
const CODE = /^[A-Za-z0-9_-]{22}$/

export const isInviteCode = (code: string): boolean => CODE.test(code)

export const invitePath = (code: string): string => `/pozvanka/${code}`

/** The code of an invite path (`/pozvanka/{kód}`), as `from` carries it; else null. */
export const inviteCodeFromPath = (path: string | undefined): string | null => {
  const match = /^\/pozvanka\/([^/?#]+)\/?(?:[?#]|$)/.exec(path ?? "")
  return match?.[1] && isInviteCode(match[1]) ? match[1] : null
}

type Stored = { code: string; savedAt: number }

const read = (): Stored | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Stored>
    return typeof stored.code === "string" && typeof stored.savedAt === "number"
      ? (stored as Stored)
      : null
  } catch {
    return null
  }
}

const write = (stored: Stored | null) => {
  try {
    if (stored) localStorage.setItem(KEY, JSON.stringify(stored))
    else localStorage.removeItem(KEY)
  } catch {
    // private mode or blocked storage: the code still travels in the address
  }
}

/**
 * A visitor opening the link: remember the code in this browser. Only signed out (the route
 * decides): a signed-in passer-by would leave it for the next person on a shared computer.
 */
export const rememberInvite = (code: string, now = Date.now()) => {
  if (isInviteCode(code)) write({ code, savedAt: now })
}

/**
 * The invite waiting for the onboarding: from `from` first (this sign-up's own link), else the
 * one remembered in this browser if it is under 30 days old.
 */
export const pendingInvite = (from: string | undefined, now = Date.now()): string | null => {
  const stored = read()
  const fresh = stored && now - stored.savedAt <= KEPT_MS ? stored : null
  return inviteCodeFromPath(from) ?? fresh?.code ?? null
}

/** „Přidat do přátel“ or „Teď ne“ (or no such invite): the browser forgets the code. */
export const answerInvite = () => {
  write(null)
}

/**
 * The share sheet's message (brief §4): with interests „Hledám parťáky na volejbal a běh. …“,
 * without them the general one. The link goes along as the share's `url`.
 */
export const inviteShareText = (interests: string[]): string => {
  const named = interests.slice(0, 2).map(inSentence)
  return named.length
    ? `Hledám parťáky na ${named.join(" a ")}. Pojď na HobbyHub, ať máme s kým vyrazit.`
    : "Jsem na HobbyHubu, kde se dají najít akce a lidi na koníčky. Přidej se."
}

/** „Přes tvůj odkaz se přidal 1 člověk / přidali 3 lidé / přidalo 5 lidí.“ (numbers, brief §4) */
export const joinedLine = (count: number): string =>
  count === 1
    ? "Přes tvůj odkaz se přidal 1 člověk."
    : count >= 2 && count <= 4
      ? `Přes tvůj odkaz se přidali ${count} lidé.`
      : `Přes tvůj odkaz se přidalo ${count} lidí.`
