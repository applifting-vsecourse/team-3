import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react"
import { Link } from "@tanstack/react-router"
import { Check, Loader2 } from "lucide-react"

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
  DialogTrigger,
} from "@/components/ui/dialog"

import type { EventDetail } from "@/features/events/api/eventSchemas"

export type Viewer = { id: string; emailVerified: boolean }

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
   */
  onJoin: () => Promise<unknown>
  onLeave: () => Promise<unknown>
  /** For tests; the event has started once `startsAt` is past it. */
  now?: Date
}

/**
 * The one action of the event detail (B-032, Figma A-05 · Stavy): „Přijdu“
 * → „Jdu“ + „Odhlásit se“, „Plno“, the sign-in for a visitor, and for the
 * organizer „Spravovat akci“ next to „Přijdu“. An event with approval takes
 * a request instead (A-05a, #53), confirmed first and without a message
 * (that is #60).
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
  // or has started (#43)
  const manage = isOrganizer ? <ManageLink eventId={event.id} /> : null

  if (event.status === "cancelled") return manage ? <Row>{manage}</Row> : null
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
  if (!viewer.emailVerified) {
    // full: verifying wouldn't get a place either; the banner still asks to verify
    return (
      <Row>
        {manage}
        {event.isFull ? <FullButton /> : <Note>Na akci se přihlásíš, až si ověříš e-mail.</Note>}
      </Row>
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
> & { isOrganizer: boolean }

function JoinControl({ event, isOrganizer, isPending, onJoin, onLeave }: JoinControlProps) {
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
    case "approved":
      return (
        <>
          <Status
            ref={focusTarget}
            // the organizer makes the changes, nobody needs to tell them
            note={isOrganizer ? undefined : "Změny akce uvidíš tady a v Mých akcích."}
          >
            <Check
              aria-hidden
              className="size-5"
            />
            Jdu
          </Status>
          <ConfirmButton
            label="Odhlásit se"
            title="Odhlásit se z akce?"
            description="Místo se uvolní pro další zájemce."
            isPending={isPending}
            onConfirm={change(onLeave)}
          />
        </>
      )
    case "pending":
      return (
        <>
          {/* no e-mail tells the decision yet (US-08), so say where it shows */}
          <Status
            ref={focusTarget}
            note="Rozhodnutí uvidíš tady a v Mých akcích."
          >
            Čeká na schválení
          </Status>
          <ConfirmButton
            label="Stáhnout žádost"
            title="Stáhnout žádost o účast?"
            description="Organizátor ji pak už neuvidí."
            isPending={isPending}
            onConfirm={change(onLeave)}
          />
        </>
      )
    case "rejected":
      // gender-neutral (DESIGN.md › Copy): the organizer may well be a woman
      return <Note>Tvoje žádost o účast byla zamítnuta.</Note>
    case "removed":
      return <Note>Na akci už nemáš místo.</Note>
    case null:
      break
  }

  if (event.isFull) return <FullButton />
  // the organizer joins at once even with approval (Q12); anyone else asks
  if (event.approvalMode === "approval" && !isOrganizer) {
    return (
      <>
        <ConfirmButton
          variant="default"
          triggerRef={focusTarget}
          label="Poslat žádost"
          title="Poslat žádost o účast?"
          description="Organizátor žádost schválí, nebo zamítne. Dokud nerozhodne, můžeš ji stáhnout."
          isPending={isPending}
          onConfirm={change(onJoin)}
        />
        {/* Figma A-05, under the button in the bar */}
        <Note>Organizátor žádost schválí, nebo zamítne. Do začátku akce ji můžeš stáhnout.</Note>
      </>
    )
  }
  const join = change(onJoin)
  return (
    <Button
      ref={focusTarget}
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

/** Where the viewer stands („Jdu“, „Čeká na schválení“) and what comes next. */
function Status({
  ref,
  note,
  children,
}: {
  ref: Ref<HTMLDivElement>
  note?: string
  children: ReactNode
}) {
  return (
    // focused from code only (after a change), never a Tab stop; the
    // browser's focus outline stays, a little off the text
    <div
      ref={ref}
      tabIndex={-1}
      className="flex flex-col gap-1 rounded-md outline-offset-4"
    >
      <p className="inline-flex items-center gap-2 font-semibold">{children}</p>
      {note ? <Note>{note}</Note> : null}
    </div>
  )
}

// Muted, not lime: lime is for what you can do (DESIGN.md, „Plno“ is muted);
// a disabled lime button reads as broken, in the dark theme especially.
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
  /** The one action of the detail is `default`; leaving and withdrawing are `outline`. */
  variant?: "default" | "outline"
  triggerRef?: Ref<HTMLButtonElement>
  label: string
  title: string
  description: string
  isPending: boolean
  /** Resolves once done, and the dialog closes; rejects, and it stays open to try again. */
  onConfirm: () => Promise<unknown>
}

/**
 * Figma A-05a / A-05b: a request, leaving and withdrawing are confirmed, so a
 * stray tap doesn't send a request or give the place away. Like „Zrušit
 * akci?“, the dialog waits for the answer: it doesn't close on a request
 * that may still fail.
 */
function ConfirmButton({
  variant = "outline",
  triggerRef,
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
          ref={triggerRef}
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

function ManageLink({ eventId }: { eventId: string }) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
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
function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}

function Note({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
