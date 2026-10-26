import { cn } from "@/lib/utils"

import {
  PASSWORD_STRENGTH_LABELS,
  passwordStrength,
  type PasswordStrength as Strength,
} from "@/features/auth/lib/password"

const FILLED: Record<Strength, number> = { weak: 1, good: 2, strong: 3 }

type PasswordStrengthProps = {
  password: string
}

/**
 * #153: the strength of the password being typed. The word says it, so it reads
 * without colour; the bar of three parts only repeats it. A screen reader hears
 * the word whenever it changes (a polite live region, present even while empty,
 * or the first change isn't announced).
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = password ? passwordStrength(password) : null

  return (
    <div className="grid gap-2">
      {strength ? (
        <div
          aria-hidden
          className="grid grid-cols-3 gap-1"
        >
          {[1, 2, 3].map((part) => (
            <span
              key={part}
              className={cn(
                "h-1 rounded-full",
                part <= FILLED[strength] ? "bg-foreground" : "bg-muted",
              )}
            />
          ))}
        </div>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {strength ? (
          <>
            Síla hesla:{" "}
            <span className="font-medium text-foreground">
              {PASSWORD_STRENGTH_LABELS[strength]}
            </span>
          </>
        ) : null}
      </p>
    </div>
  )
}
