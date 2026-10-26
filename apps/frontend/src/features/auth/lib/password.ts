import { z } from "zod"

/** B-010, the same rule as the API's: at least 10 characters, a letter and a digit. */
export const PASSWORD_RULE = "Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici."

const MIN_LENGTH = 10

export const passwordSchema = z
  .string()
  .min(MIN_LENGTH, PASSWORD_RULE)
  .regex(/\p{L}/u, PASSWORD_RULE)
  .regex(/\d/, PASSWORD_RULE)

/** #153: how strong a password is, shown while it's typed. */
export type PasswordStrength = "weak" | "good" | "strong"

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: "slabé",
  good: "dobré",
  strong: "silné",
}

/**
 * zxcvbn's estimate of how many guesses the password takes: 0 under 10³,
 * 1 under 10⁶, 2 under 10⁸, 3 under 10¹⁰ („safely unguessable“), 4 more.
 */
export type PasswordScore = 0 | 1 | 2 | 3 | 4

/** What the strength estimator (password-checker.ts) says about a password. */
export type PasswordCheck = {
  score: PasswordScore
  warning: string | null
  suggestions: string[]
}

/** The level to show and one or two short sentences of advice. */
export type PasswordStrengthResult = {
  level: PasswordStrength
  hint: string | null
}

/**
 * The level for zxcvbn's score, where Stytch, Clerk and Bitwarden draw the
 * line: 3 is good, 4 strong, anything less weak. A password the API would
 * refuse (B-010) is weak whatever the score — a phrase without a digit too.
 */
export function strengthLevel(password: string, score: PasswordScore): PasswordStrength {
  if (!passwordSchema.safeParse(password).success) return "weak"
  if (score === 4) return "strong"
  return score === 3 ? "good" : "weak"
}

const charactersLeft = (count: number) =>
  `Ještě ${count} ${count === 1 ? "znak" : count <= 4 ? "znaky" : "znaků"}.`

/**
 * What the password still lacks to pass B-010, in Czech, or null when it
 * passes. Characters are counted as people see them (code points), so an
 * emoji is one.
 */
export function missingForRule(password: string): string | null {
  const missing: string[] = []
  const left = MIN_LENGTH - [...password].length
  if (left > 0) missing.push(charactersLeft(left))
  if (!/\d/.test(password)) missing.push("Přidej číslici.")
  if (!/\p{L}/u.test(password)) missing.push("Přidej písmeno.")
  return missing.length > 0 ? missing.join(" ") : null
}

const GOOD_HINT = "Silnější bude s dalším slovem."

/**
 * #153: the meter's verdict. Until the password passes B-010 it says what is
 * missing, no estimator needed. After that it is the estimator's call
 * (`check`); without one yet (the dictionaries are still loading, or failed
 * to load) there is no verdict rather than a guess.
 */
export function describePasswordStrength(
  password: string,
  check: PasswordCheck | null,
): PasswordStrengthResult | null {
  if (!password) return null
  const missing = missingForRule(password)
  if (missing) return { level: "weak", hint: missing }
  if (!check) return null

  const level = strengthLevel(password, check.score)
  if (level === "strong") return { level, hint: null }
  if (level === "good") return { level, hint: GOOD_HINT }
  const hint = [check.warning, check.suggestions[0]].filter(Boolean).join(" ")
  return { level, hint: hint || null }
}

const SITE_WORDS = ["hobbyhub", "hobby", "hub", "akce"]

const withoutDiacritics = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "")

/**
 * Words from the form and the site that make a password easy to guess for
 * whoever knows them (Bitwarden and Auth0 do the same; NIST and ASVS ask for
 * it): the name, its parts and the name without spaces, the e-mail before the
 * @ and its parts, and the site's own words. Each also without diacritics, in
 * lower case, once, and only from 3 characters up.
 */
export function passwordUserInputs(name: string, email: string): string[] {
  const fullName = name.trim().toLowerCase()
  const local = email.trim().toLowerCase().split("@")[0] ?? ""
  const words = [
    fullName,
    ...fullName.split(/[\s.'’-]+/u),
    fullName.replace(/\s+/gu, ""),
    local,
    ...local.split(/[^\p{L}\p{N}]+/u),
    ...SITE_WORDS,
  ]
  const variants = words.flatMap((word) => [word, withoutDiacritics(word)])
  return [...new Set(variants.filter((word) => [...word].length >= 3))]
}
