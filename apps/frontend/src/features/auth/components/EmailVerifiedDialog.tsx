import { useState } from "react"
import { Link, useLocation, useNavigate, type ParsedLocation } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { ResendVerificationButton } from "@/features/auth/components/ResendVerificationButton"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import type { VerificationResult } from "@/features/auth/lib/verification-result"

/** BetterAuth's codes on a link that didn't work, said shortly. */
const REASONS: Record<string, string> = {
  TOKEN_EXPIRED: "Odkaz už vypršel.",
  INVALID_TOKEN: "Odkaz je neplatný.",
  USER_NOT_FOUND: "Účet k tomuto odkazu už neexistuje.",
}

/**
 * The button that closes the dialog says what is under it: the event the
 * sign-up started on, or the events. Any other page (a group, Moje akce…)
 * stays „Pokračovat“.
 */
const continueLabel = (pathname: string) => {
  if (/^\/akce\/(?!nova\/?$)[^/]+\/?$/.test(pathname)) return "Zpět na akci"
  if (pathname === ROUTES.events) return "Procházet akce"
  return "Pokračovat"
}

/**
 * Figma B-02 as a dialog (#155): what the link in the verification e-mail
 * did, over the page the sign-up started from rather than on an empty page of
 * its own. /email-overen leads there with the result in the history state;
 * mounted once in the root. Closing takes the result out of that history
 * entry, so neither a reload nor „Zpět“ to the page shows it again.
 */
export function EmailVerifiedDialog() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useSession()
  const result = location.state.emailVerification
  // the content stays while the dialog fades out, after the result is gone
  const [shownResult, setShownResult] = useState(result)
  if (result && result !== shownResult) setShownResult(result)

  const close = () =>
    void navigate({
      href: location.href,
      replace: true,
      resetScroll: false,
      state: (prev) => ({ ...prev, emailVerification: undefined }),
    })

  return (
    <Dialog
      open={Boolean(result)}
      onOpenChange={(isOpen) => {
        if (!isOpen) close()
      }}
    >
      <DialogContent>
        {shownResult ? (
          <VerificationOutcome
            result={shownResult}
            user={user}
            location={location}
            onDone={close}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type VerificationOutcomeProps = {
  result: VerificationResult
  user: SessionUser | null
  /** The page under the dialog. */
  location: ParsedLocation
  /** A new link is on its way: nothing left to do here. */
  onDone: () => void
}

function VerificationOutcome({ result, user, location, onDone }: VerificationOutcomeProps) {
  const label = continueLabel(location.pathname)
  // Signed in, the fresh session decides (an old link opened again after the
  // e-mail was verified needs nothing more); signed out, the link itself.
  const isVerified = user ? user.emailVerified : !result.error

  if (isVerified) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>E-mail je ověřený</DialogTitle>
          <DialogDescription>
            Teď se můžeš hlásit na akce a zakládat vlastní akce i skupiny.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>{label}</Button>
          </DialogClose>
        </DialogFooter>
      </>
    )
  }

  const reason = result.error ? (REASONS[result.error] ?? "Odkaz je neplatný.") : null
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {reason ? "E-mail se nepodařilo ověřit" : "E-mail zatím není ověřený"}
        </DialogTitle>
        <DialogDescription>
          {!reason
            ? "Otevři odkaz z e-mailu, nebo si pošli nový."
            : user
              ? `${reason} Pošli si nový, platí 24 hodin.`
              : `${reason} Nový si pošleš po přihlášení.`}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">{label}</Button>
        </DialogClose>
        {user ? (
          <ResendVerificationButton
            email={user.email}
            onDone={onDone}
          />
        ) : (
          <Button asChild>
            <Link
              to={ROUTES.login}
              search={{ from: encodeRedirectUri(location) }}
            >
              Přihlásit se
            </Link>
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
