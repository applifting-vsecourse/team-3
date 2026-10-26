import { useEffect, useMemo, useState } from "react"

import {
  loadPasswordChecker,
  type PasswordChecker,
} from "@/features/auth/lib/load-password-checker"
import {
  describePasswordStrength,
  missingForRule,
  strengthBars,
  type PasswordStrengthResult,
} from "@/features/auth/lib/password"

// Clerk waits 350 ms, Bitwarden 300 ms: the verdict (and what a screen reader
// says) follows a pause in typing, not every key.
const DEBOUNCE_MS = 300

/**
 * #153: the strength of the password being typed, or null — while the field is
 * empty (at once), before the first pause in typing, and while the estimator
 * is loading for a password that already passes B-010. `userInputs` are words
 * the password shouldn't lean on (passwordUserInputs).
 */
export function usePasswordStrength(
  password: string,
  userInputs: string[],
): (PasswordStrengthResult & { bars: number }) | null {
  const inputsKey = userInputs.join("\n")
  // what was typed at the last pause
  const [settled, setSettled] = useState({ password: "", inputsKey: "" })
  useEffect(() => {
    // a cleared field settles at once, so the last verdict can't come back
    // with the first character of the next password
    const timeout = setTimeout(
      () => setSettled({ password, inputsKey }),
      password ? DEBOUNCE_MS : 0,
    )
    return () => clearTimeout(timeout)
  }, [password, inputsKey])

  // Loading starts with the first character (autofill and paste too; the form
  // starts it on focus already); after a failure, the next pause tries again.
  const [checker, setChecker] = useState<PasswordChecker | null>(null)
  const hasPassword = password !== ""
  useEffect(() => {
    if (!hasPassword || checker) return
    let isCurrent = true
    loadPasswordChecker().then(
      (loaded) => {
        if (isCurrent) setChecker(loaded)
      },
      // without it the meter shows the rule alone
      () => undefined,
    )
    return () => {
      isCurrent = false
    }
  }, [hasPassword, checker, settled])

  const result = useMemo(() => {
    const { password: typed, inputsKey: words } = settled
    // the estimate (up to ~0.1 s) only once the rule is met; until then the
    // verdict is what's missing
    const isEstimated = checker !== null && typed !== "" && missingForRule(typed) === null
    const check = isEstimated ? checker.checkPassword(typed, words ? words.split("\n") : []) : null
    const verdict = describePasswordStrength(typed, check)
    const bars = strengthBars(typed, check)
    return verdict && bars ? { ...verdict, bars } : null
  }, [settled, checker])

  return password ? result : null
}
