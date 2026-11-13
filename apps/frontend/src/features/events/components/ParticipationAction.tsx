import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Info, Loader2 } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { RequestDialog } from "@/components/RequestDialog/RequestDialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { inSentence } from "@/lib/inSentence"
import {
  gatheredLabel,
  happeningThanks,
  isMinimumReachedByLast,
  missedMinimumLabel,
} from "@/lib/occupancy"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { HasPlace } from "@/features/events/components/HasPlace"
import {
  formatEventDay,
  formatRequestEventStart,
  isEventOver,
} from "@/features/events/lib/formatEvent"

// Signed in means verified (#236): an unverified e-mail can't sign in, and an
// old session gets the API's 403 EMAIL_NOT_VERIFIED as the error message.
export type Viewer = { id: string }

type ParticipationActionProps = {
  event: EventDetail
  /** null for a visitor */
  viewer: Viewer | null
  /** Login's `from`, so signing in comes back to this event. */
  signInFrom: string
  isPending: boolean
  /**
   * Resolve once the place or the request is saved, and reject when it
   * isn't: the page says why, a confirmation dialog stays open to try again.
   * A request may carry a message for the organizer (#175). Resolves with the detail as the
   * API answers, which says whether this place reached the minimum.
   */
  onJoin: (message?: string | null) => Promise<EventDetail>
  onLeave: () => Promise<unknown>
  /** For tests; the event has started once `startsAt` is past it. */
  now?: Date
}

/**
 * The one action of the event detail (B-032, Figma A-05 · Stavy): „Přijdu“
 * → „Máš místo“ + „Odhlásit se“, „Plno“ with similar events nearby, the
 * sign-in for a visitor, and for the organizer „Spravovat akci“ with „Přijdu“
 * beside it. An event with approval takes a request instead (A-05a, #53),
 * confirmed in a dialog with an optional message for the organizer (#175); a
 * rejected one points to similar events, as a full one does — neither is a
 * dead end (UX audit U2).
 */
export function ParticipationAction({
  event,
  viewer,
  signInFrom,
  isPending,
  onJoin,
  onLeave,
  now = new Date(),
}: ParticipationActionProps) {
  const isOrganizer = viewer !== null && event.organizer.id === viewer.id
  // in every state: who was coming still matters once the event is cancelled
  // or has started (#43); the group's admins manage its events too (B-055)
  const manage = event.canManage ? <ManageLink eventId={event.id} /> : null

  if (event.status === "cancelled") return manage ? <Row>{manage}</Row> : null
  if (isEventOver(event, now)) {
    // Figma A-05 · Stavy › Proběhlá akce; an event whose minimum never came didn't take place
    const day = inSentence(formatEventDay(event.startsAt))
    const hasHappened = event.missingToMin === 0
    return (
      <Row>
        {manage}
        <Alert variant="neutral">
          <Info />
          <AlertTitle>
            {hasHappened ? `Akce proběhla v ${day}` : `Akce se v ${day} nekonala`}
          </AlertTitle>
          <AlertDescription>
            {hasHappened ? `${gatheredLabel(event.approvedCount)}.` : missedMinimumLabel(event)}{" "}
            <Link
              to={ROUTES.events}
              search={similarEventsSearch(event)}
              className="font-medium underline underline-offset-4"
            >
              Podobné akce najdeš v Akcích
            </Link>
            .
          </AlertDescription>
        </Alert>
      </Row>
    )
  }
  if (event.startsAt <= now) {
    return (
      <Row>
        {manage}
        <Note>
          {event.myParticipation === "approved"
            ? "Akce už začala. Máš na ní místo."
            : "Akce už začala."}
        </Note>
      </Row>
    )
  }

  // A visitor isn't sent to sign in for a place there isn't (B-032: „Plno“);
  // someone signed out who has a place or a request still gets back to it.
  if (!viewer && event.isFull) {
    return (
      <Row>
        <FullButton />
        <SimilarEvents event={event} />
        <p className="text-sm text-muted-foreground">
          Máš na akci místo nebo žádost?{" "}
          <Link
            to={ROUTES.login}
            search={{ from: signInFrom }}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Přihlas se k účtu
          </Link>
          .
        </p>
      </Row>
    )
  }
  if (!viewer) {
    return (
      <Row>
        <Button
          asChild
          size="lg"
        >
          <Link
            to={ROUTES.login}
            search={{ from: signInFrom }}
          >
            Přihlásit se na akci
          </Link>
        </Button>
        {/* Figma A-05d; sign-up keeps the way back too (B-012) */}
        <Note>
          Přihlásit se na akci můžeš s účtem. Po přihlášení nebo registraci tě vrátíme sem.
        </Note>
      </Row>
    )
  }
  // Figma A-05 · Stavy › Vlastní akce: managing is the main action, joining sits beside it
  // (Q12: the organizer joins without approval)
  const canJoinAtOnce = isOrganizer || event.approvalMode === "open"
  if (event.canManage && event.myParticipation === null && !event.isFull && canJoinAtOnce) {
    return (
      <div className="flex gap-2">
        <ManageLink
          eventId={event.id}
          isPrimary
        />
        <JoinControl
          event={event}
          isOrganizer={isOrganizer}
          isPending={isPending}
          onJoin={onJoin}
          onLeave={onLeave}
          isSecondary
        />
      </div>
    )
  }

  return (
    <Row>
      {manage}
      <JoinControl
        event={event}
        isOrganizer={isOrganizer}
        isPending={isPending}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    </Row>
  )
}

type JoinControlProps = Pick<
  ParticipationActionProps,
  "event" | "isPending" | "onJoin" | "onLeave"
> & {
  isOrganizer: boolean
  /** „Přijdu“ beside „Spravovat akci“: outline, the primary button stays one (Figma A-05 · Stavy). */
  isSecondary?: boolean
}

function JoinControl({
  event,
  isOrganizer,
  isPending,
  onJoin,
  onLeave,
  isSecondary = false,
}: JoinControlProps) {
  // The control just used goes away with the change („Poslat žádost“ →
  // „Čeká na schválení“), so focus moves to what replaced it instead of
  // falling to <body>: the new state, or the button to come back.
  const shouldFocusNewState = useRef(false)
  const newState = useRef<HTMLElement | null>(null)
  const focusTarget = useCallback((node: HTMLElement | null) => {
    newState.current = node
  }, [])
  useEffect(() => {
    if (!shouldFocusNewState.current) return
    shouldFocusNewState.current = false
    newState.current?.focus()
  }, [event.myParticipation])
  // „Díky tobě se akce koná…“ only when this sign-up reached the minimum (DESIGN.md › Máš
  // místo); known only here, at the moment of joining — a reload just says „Máš místo“
  const [hasJustJoined, setHasJustJoined] = useState(false)
  const [hasReachedMinimum, setHasReachedMinimum] = useState(false)
  // The page's cache shows the place before `onJoin` resolves (React Query's onSuccess), so
  // the thanks and the dot are worked out in the render that first shows it — not one render
  // later, after a screen reader has read the other line (review #259). The detail then is
  // the API's answer, so its numbers decide, not the ones from before the click.
  const [isJoining, setIsJoining] = useState(false)
  if (isJoining && event.myParticipation !== null) {
    setIsJoining(false)
    // answered without a place (a request): nothing to thank for
    if (event.myParticipation === "approved") {
      setHasJustJoined(true)
      setHasReachedMinimum(isMinimumReachedByLast(event))
    }
  }
  const change = (action: () => Promise<unknown>) => async () => {
    shouldFocusNewState.current = true
    try {
      await action()
    } catch (error) {
      shouldFocusNewState.current = false
      throw error
    }
  }

  switch (event.myParticipation) {
    case "approved": {
      // gone again once someone leaves and the minimum is missed
      const isThanks = hasReachedMinimum && event.missingToMin === 0
      return (
        <>
          {/* focused from code only (after a change), as Status */}
          <div
            ref={focusTarget}
            tabIndex={-1}
            className="rounded-lg outline-offset-4"
          >
            <HasPlace
              line={
                isThanks
                  ? happeningThanks(event)
                  : // the organizer makes the changes, nobody needs to tell them
                    isOrganizer
                    ? undefined
                    : "Změny akce uvidíš tady a v Mých akcích."
              }
              isFillAnimated={hasJustJoined}
            />
          </div>
          <ConfirmButton
            label="Odhlásit se"
            title="Odhlásit se z akce?"
            description="Místo se uvolní pro další zájemce."
            isPending={isPending}
            onConfirm={change(onLeave)}
          />
        </>
      )
    }
    case "pending":
      return (
        <>
          {/* Figma's „Až ji organizátor schválí, přijde ti e-mail.“ comes with the e-mails
              (#177); until then say where the decision shows */}
          <div
            ref={focusTarget}
            tabIndex={-1}
            className="rounded-lg outline-offset-4"
          >
            <Alert variant="info">
              <Info />
              <AlertTitle>Žádost čeká na schválení</AlertTitle>
              <AlertDescription>Rozhodnutí uvidíš tady a v Mých akcích.</AlertDescription>
            </Alert>
          </div>
          <ConfirmButton
            variant="outline"
            label="Stáhnout žádost"
            title="Stáhnout žádost o účast?"
            description="Organizátor ji pak už neuvidí."
            isPending={isPending}
            onConfirm={change(onLeave)}
          />
        </>
      )
    case "rejected":
      // Figma A-05 · Stavy › Žádost zamítnutá; a new request isn't possible (team, 4. 11.).
      // Hlas aplikace's wording: passive, so the organizer gets no gendered verb (DESIGN.md › Copy).
      return (
        <>
          <Alert variant="neutral">
            <Info />
            <AlertTitle>Tentokrát to nevyšlo</AlertTitle>
            <AlertDescription>
              Tvoje žádost o účast nebyla přijata. Mrkni na podobné akce v okolí.
            </AlertDescription>
          </Alert>
          <SimilarEvents
            event={event}
            variant="outline"
          />
        </>
      )
    case "removed":
      return <Note>Na akci už nemáš místo.</Note>
    case null:
      break
  }

  if (event.isFull) {
    return (
      <>
        <FullButton />
        <SimilarEvents event={event} />
      </>
    )
  }
  // the organizer joins at once even with approval (Q12); anyone else asks
  if (event.approvalMode === "approval" && !isOrganizer) {
    return (
      <>
        <RequestDialog
          title="Poslat žádost o účast?"
          description={`${event.title}, ${formatRequestEventStart(event.startsAt)}. Organizátor žádost schválí nebo zamítne; do začátku akce ji můžeš stáhnout.`}
          label="Zpráva pro organizátora (nepovinné)"
          isPending={isPending}
          onSend={(message) => change(() => onJoin(message))()}
        >
          <Button
            ref={focusTarget}
            size="lg"
            // a second request while the first is on its way would only fail
            disabled={isPending}
          >
            Poslat žádost
          </Button>
        </RequestDialog>
        {/* Figma A-05, under the button in the bar */}
        <Note>Organizátor žádost schválí, nebo zamítne. Do začátku akce ji můžeš stáhnout.</Note>
      </>
    )
  }
  // the API's answer tells whether this place reached the minimum; the cached numbers from
  // before the click may be stale (someone else may have joined meanwhile)
  const join = change(async () => {
    setIsJoining(true)
    try {
      await onJoin()
    } catch (error) {
      // refused: the button stays, nothing to thank for
      setIsJoining(false)
      throw error
    }
  })
  return (
    <Button
      ref={focusTarget}
      variant={isSecondary ? "outline" : "default"}
      size="lg"
      disabled={isPending}
      // a refusal is the page's toast; the button stays to try again
      onClick={() => join().catch(() => undefined)}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      Přijdu
    </Button>
  )
}

// Muted, not lime: lime is for what you can do (DESIGN.md, „Plno“ is muted);
// a disabled lime button reads as broken.
function FullButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      disabled
    >
      Plno
    </Button>
  )
}

type ConfirmButtonProps = {
  /** Figma A-05 · Stavy: „Odhlásit se“ ghost under „Máš místo“, „Stáhnout žádost“ outline. */
  variant?: "ghost" | "outline"
  label: string
  title: string
  description: string
  isPending: boolean
  /** Resolves once done, and the dialog closes; rejects, and it stays open to try again. */
  onConfirm: () => Promise<unknown>
}

/**
 * Figma A-05b: leaving and withdrawing are confirmed, so a stray tap doesn't
 * give the place away (a request has its own dialog with a message, #175).
 * Like „Zrušit akci?“, the dialog waits for the answer: it doesn't close on a
 * request that may still fail. The button is `ghost`: once in, „Jdu“ / „Čeká
 * na schválení“ is what the bar says. Withdrawing a request is `outline`, as in
 * Figma A-05 · Stavy.
 */
function ConfirmButton({
  variant = "ghost",
  label,
  title,
  description,
  isPending,
  onConfirm,
}: ConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size="lg"
          // a second confirmation while the first is on its way would only fail
          disabled={isPending}
        >
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zpět</Button>
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={async () => {
              try {
                await onConfirm()
                setIsOpen(false)
              } catch {
                // the page's toast says why; the dialog stays to try again
              }
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManageLink({ eventId, isPrimary = false }: { eventId: string; isPrimary?: boolean }) {
  return (
    <Button
      asChild
      variant={isPrimary ? "default" : "outline"}
      size="lg"
      className={isPrimary ? "flex-1" : undefined}
    >
      <Link
        to={ROUTES.manageEvent}
        params={{ eventId }}
      >
        Spravovat akci
      </Link>
    </Button>
  )
}

// Stacked, the buttons take the width of the bar or the panel (Figma A-05, A-05d).
// The desktop panel lays the column into its own and puts the notes after „Sdílet odkaz“.
function Row({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="participation"
      className="flex flex-col gap-3"
    >
      {children}
    </div>
  )
}

function Note({ children }: { children: string }) {
  return (
    <p
      data-slot="participation-note"
      className="text-sm text-muted-foreground"
    >
      {children}
    </p>
  )
}

/** /akce with the same activity in the same locality (UX audit U2). */
const similarEventsSearch = (event: EventDetail) => ({
  lokalita: event.locality.slug,
  aktivita: event.activity.slug,
})

/**
 * „Podobné akce v okolí“ (Figma A-05 · Stavy, UX audit U2): /akce with the same activity in
 * the same locality, so a full event or a rejected request isn't a dead end.
 */
function SimilarEvents({
  event,
  variant = "ghost",
}: {
  event: EventDetail
  variant?: "ghost" | "outline"
}) {
  return (
    <Button
      asChild
      variant={variant}
      size="lg"
      className={variant === "ghost" ? "self-start" : undefined}
    >
      <Link
        to={ROUTES.events}
        search={similarEventsSearch(event)}
      >
        Podobné akce v okolí
      </Link>
    </Button>
  )
}
