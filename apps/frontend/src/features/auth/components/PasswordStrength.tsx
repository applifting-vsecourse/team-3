import { useState } from "react"

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
 * zxcvbn's score, so it grows with each better step, inside „slabé“ too. A
 * screen reader hears the word and the advice together after a pause in
 * typing (a polite live region, present even while empty, or the first change
 * isn't announced).
 *
 * #199: until the first character the area takes no room — the live region is
 * only visually hidden (`sr-only` is out of the flow, so the form item's gap
 * doesn't count it either). From the first character on it has one height:
 * the bar at once (empty until the verdict) and room for the verdict and two
 * lines of advice, kept by an invisible placeholder in the same grid cell, so
 * neither the verdict nor advice coming and going moves the fields below. It
 * stays when the field is cleared, so deleting and retyping doesn't jump.
 */
export function PasswordStrength({ password, userInputs }: PasswordStrengthProps) {
  const strength = usePasswordStrength(password, userInputs)
  // once shown, always shown (state adjusted while rendering, not in an
  // effect, so the area appears with the first character's render)
  const [isShown, setIsShown] = useState(password !== "")
  if (!isShown && password !== "") setIsShown(true)

  return (
    <div
      data-slot="password-strength"
      className={isShown ? "grid gap-2" : "sr-only"}
    >
      {isShown ? (
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
                strength && part <= strength.bars ? "bg-foreground" : "bg-muted",
              )}
            />
          ))}
        </div>
      ) : null}
      <div className="grid text-sm">
        {isShown ? (
          // the verdict's line and two of advice, whatever is shown over it
          <span
            aria-hidden
            data-slot="password-strength-room"
            className="invisible col-start-1 row-start-1"
          >
            {" "}
            <br />
            {" "}
            <br />
            {" "}
          </span>
        ) : null}
        <p
          role="status"
          aria-live="polite"
          className="col-start-1 row-start-1 text-muted-foreground"
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
    </div>
  )
}
