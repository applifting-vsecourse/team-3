import { z } from "zod"

/** B-010, the same rule as the API's: at least 10 characters, a letter and a digit. */
export const PASSWORD_RULE = "Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici."

export const passwordSchema = z
  .string()
  .min(10, PASSWORD_RULE)
  .regex(/\p{L}/u, PASSWORD_RULE)
  .regex(/\d/, PASSWORD_RULE)

/** #153: how strong a password is, shown while it's typed. */
export type PasswordStrength = "weak" | "good" | "strong"

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: "slabé",
  good: "dobré",
  strong: "silné",
}

// lower case, upper case, digits, anything else (a space, -, ! …)
const CHARACTER_KINDS = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u]

/**
 * Weak until it passes the rule above (the API would refuse it). Strong when
 * it's long and mixed — 14 characters of three kinds — or simply long, a
 * phrase of 20 characters. Good in between.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!passwordSchema.safeParse(password).success) return "weak"
  const length = [...password].length
  const kinds = CHARACTER_KINDS.filter((kind) => kind.test(password)).length
  return (length >= 14 && kinds >= 3) || length >= 20 ? "strong" : "good"
}
