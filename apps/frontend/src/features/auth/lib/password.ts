import { z } from "zod"

/** B-010, the same rule as the API's: at least 10 characters, a letter and a digit. */
export const PASSWORD_RULE = "Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici."

export const passwordSchema = z
  .string()
  .min(10, PASSWORD_RULE)
  .regex(/\p{L}/u, PASSWORD_RULE)
  .regex(/\d/, PASSWORD_RULE)
