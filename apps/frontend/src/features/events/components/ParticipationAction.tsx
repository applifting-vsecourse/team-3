import { useState, type ReactNode } from "react"
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
  onJoin: () => void
  onLeave: () => void
  /** For tests; the event has started once `startsAt` is past it. */
  now?: Date
}

/**
 * The one action of the event detail (B-032, Figma A-05 · Stavy): „Přijdu“
 * → „Jdu“ + „Odhlásit se“, „Plno“, the sign-in for a visitor, and for the
 * organizer „Spravovat akci“ next to „Přijdu“. A request to an event with
 * approval is #53; until then such an event says so.
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

  if (!viewer) {
    return (
      <Button
        asChild
        size="lg"
        className="self-start"
      >
        <Link
          to={ROUTES.login}
          search={{ from: signInFrom }}
        >
          Přihlásit se na akci
        </Link>
      </Button>
    )
  }
  if (!viewer.emailVerified) {
    return (
      <Row>
        {manage}
        <Note>Na akci se přihlásíš, až si ověříš e-mail.</Note>
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
  switch (event.myParticipation) {
    case "approved":
      return (
        <>
          <p className="inline-flex items-center gap-2 font-semibold">
            <Check
              aria-hidden
              className="size-5"
            />
            Jdu
          </p>
          <LeaveButton
            label="Odhlásit se"
            title="Odhlásit se z akce?"
            description="Místo se uvolní pro další zájemce."
            isPending={isPending}
            onConfirm={onLeave}
          />
        </>
      )
    case "pending":
      return (
        <>
          <p className="font-semibold">Čeká na schválení</p>
          <LeaveButton
            label="Stáhnout žádost"
            title="Stáhnout žádost o účast?"
            description="Organizátor ji pak už neuvidí."
            isPending={isPending}
            onConfirm={onLeave}
          />
        </>
      )
    case "rejected":
      return <Note>Organizátor tvoji účast zamítl.</Note>
    case "removed":
      return <Note>Organizátor tě z akce odebral.</Note>
    case null:
      break
  }

  if (event.isFull) {
    return (
      <Button
        size="lg"
        disabled
      >
        Plno
      </Button>
    )
  }
  // the organizer joins at once even with approval (Q12); a request is #53
  if (event.approvalMode === "approval" && !isOrganizer) {
    return <Note>Přihlášky na tuto akci schvaluje organizátor. Poslat žádost půjde brzy.</Note>
  }
  return (
    <Button
      size="lg"
      disabled={isPending}
      onClick={onJoin}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      Přijdu
    </Button>
  )
}

type LeaveButtonProps = {
  label: string
  title: string
  description: string
  isPending: boolean
  onConfirm: () => void
}

/** Figma A-05b: leaving is confirmed, so a stray tap doesn't give the place away. */
function LeaveButton({ label, title, description, isPending, onConfirm }: LeaveButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
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
            onClick={() => {
              onConfirm()
              setIsOpen(false)
            }}
          >
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

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

function Note({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
