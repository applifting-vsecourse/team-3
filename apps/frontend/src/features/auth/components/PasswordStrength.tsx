import { cn } from "@/lib/utils"

import { usePasswordStrength } from "@/features/auth/hooks/usePasswordStrength"
import { PASSWORD_STRENGTH_LABELS, STRENGTH_BARS } from "@/features/auth/lib/password"

type PasswordStrengthProps = {
  password: string
  /** Words the password shouldn't lean on: the name, the e-mail, the site (passwordUserInputs). */
  userInputs: string[]
}

/**
 * #153: the strength of the password being typed and one piece of advice. The
 * word says it, so it reads without colour; the bar of four parts follows
 * zxcvbn's score, so it grows with each better step, inside „slabé“ too. A screen reader hears the word and the advice together after a
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
          data-slot="password-strength-bar"
          className="grid grid-cols-4 gap-1"
        >
          {Array.from({ length: STRENGTH_BARS }, (_, index) => index + 1).map((part) => (
            <span
              key={part}
              className={cn(
                "h-1 rounded-full",
                part <= strength.bars ? "bg-foreground" : "bg-muted",
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
