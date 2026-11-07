import { useState, type MouseEvent } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
  type ParsedLocation,
} from "@tanstack/react-router"

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
import { redirectFrom } from "@/features/auth/lib/redirect"
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
  const router = useRouter()
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

  // Clear the page we leave before the link pushes /login, so it remains a
  // clean Back target after sign-in replaces the login page. Browser history
  // batches writes into one per tick (the last one wins), so the replace has to
  // be flushed before the push, or it never reaches the entry we leave.
  // A link opened in a new tab leaves this page, and its dialog, as they are.
  const beforeSignIn = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    router.history.replace(location.href, { ...location.state, emailVerification: undefined })
    router.history.flush()
  }

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
            onBeforeSignIn={beforeSignIn}
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
  onBeforeSignIn: (event: MouseEvent<HTMLAnchorElement>) => void
}

function VerificationOutcome({
  result,
  user,
  location,
  onDone,
  onBeforeSignIn,
}: VerificationOutcomeProps) {
  const label = continueLabel(location.pathname)
  // Signed in, the fresh session decides (an old link opened again after the
  // e-mail was verified needs nothing more); signed out, the link itself.
  const isVerified = user ? user.emailVerified : !result.error
  const reason = result.error ? (REASONS[result.error] ?? "Odkaz je neplatný.") : null

  if (isVerified) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>E-mail je ověřený</DialogTitle>
          <DialogDescription>
            {/* the link still gets its explanation, just not as a failure */}
            {reason ? `${reason} Nevadí, e-mail už máš ověřený. ` : null}
            Teď se můžeš hlásit na akce a zakládat vlastní akce i skupiny.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={user ? "default" : "outline"}>{label}</Button>
          </DialogClose>
          {!user ? (
            <SignInAction
              location={location}
              onBeforeSignIn={onBeforeSignIn}
            />
          ) : null}
        </DialogFooter>
      </>
    )
  }

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
          <SignInAction
            location={location}
            onBeforeSignIn={onBeforeSignIn}
          />
        )}
      </DialogFooter>
    </>
  )
}

function SignInAction({
  location,
  onBeforeSignIn,
}: {
  location: ParsedLocation
  onBeforeSignIn: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  if (location.pathname === ROUTES.login) {
    // The sign-in form is already under the dialog; preserve its existing from.
    return (
      <DialogClose asChild>
        <Button>Přihlásit se</Button>
      </DialogClose>
    )
  }
  return (
    <Button asChild>
      <Link
        to={ROUTES.login}
        search={{ from: redirectFrom(location) }}
        onClick={onBeforeSignIn}
      >
        Přihlásit se
      </Link>
    </Button>
  )
}
