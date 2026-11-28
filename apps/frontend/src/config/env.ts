import { z } from "zod"

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_BETTER_AUTH_URL: z.string().url(),
  // the paid plan (#473, B-071): until it is "true" nothing in the app mentions plans
  VITE_PREMIUM_ENABLED: z.enum(["true", "false", ""]).optional(),
})

type EnvSchema = z.infer<typeof envSchema>

export const env = ((): EnvSchema => {
  const parsed = envSchema.safeParse(import.meta.env)

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:")
    const fieldErrors = parsed.error.flatten().fieldErrors
    Object.entries(fieldErrors).forEach(([field, errors]) => {
      errors?.forEach((error) => console.error(`  ${field}: ${error}`))
    })
    throw new Error("Invalid environment variables")
  }

  return parsed.data
})()

/** The paid plan is on (#473): only then „Zobrazit tarify“ appears. Off unless "true". */
export const isPremiumEnabled = env.VITE_PREMIUM_ENABLED === "true"

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
  interface ImportMetaEnv extends EnvSchema {}
}
