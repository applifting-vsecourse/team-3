import { cn } from "@/lib/utils"

import { usePasswordStrength } from "@/features/auth/hooks/usePasswordStrength"
import {
  PASSWORD_STRENGTH_LABELS,
  type PasswordStrength as Strength,
} from "@/features/auth/lib/password"

const FILLED: Record<Strength, number> = { weak: 1, good: 2, strong: 3 }

type PasswordStrengthProps = {
  password: string
  /** Words the password shouldn't lean on: the name, the e-mail, the site (passwordUserInputs). */
  userInputs: string[]
}

/**
 * #153: the strength of the password being typed and one piece of advice. The
 * word says it, so it reads without colour; the bar of three parts only
 * repeats it. A screen reader hears the word and the advice together after a
 * pause in typing (a polite live region, present even while empty, or the
 * first change isn't announced).
 */
export function PasswordStrength({ password, userInputs }: PasswordStrengthProps) {
  const strength = usePasswordStrength(password, userInputs)

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
                part <= FILLED[strength.level] ? "bg-foreground" : "bg-muted",
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
              {PASSWORD_STRENGTH_LABELS[strength.level]}
            </span>
            .
            {strength.hint ? (
              <>
                {" "}
                <span className="block">{strength.hint}</span>
              </>
            ) : null}
          </>
        ) : null}
      </p>
    </div>
  )
}
