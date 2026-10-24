import { useState, type ComponentProps } from "react"
import { Link } from "@tanstack/react-router"
import { Info, Loader2, LogOut, X } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
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

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import { InactiveGroupNotice } from "@/features/groups/components/InactiveGroupNotice"
import { useJoinGroup, useLeaveGroup } from "@/features/groups/hooks/useGroupMutations"

type GroupMembershipActionProps = {
  group: GroupDetail
  isSignedIn: boolean
  /** Login's `from`, so a visitor who signs in to join comes back to the group. */
  signInFrom: string
}

const showError = (error: Error) => toast.error(error.message)

/**
 * The one main action of the group page, by the viewer's relation to the
 * group (Figma: A-08 · Stavy tlačítka skupiny, B-053). A deactivated group
 * only says so (#54); a block (#63) offers nothing.
 */
export function GroupMembershipAction({
  group,
  isSignedIn,
  signInFrom,
}: GroupMembershipActionProps) {
  const join = useJoinGroup(group.id)
  const leave = useLeaveGroup(group.id)
  const membership = group.viewerMembership

  if (group.status !== "active") return <InactiveGroupNotice />
  if (!hasMembershipAction(group)) return null

  if (!isSignedIn) {
    return (
      <MainButton asChild>
        <Link
          to={ROUTES.login}
          search={{ from: signInFrom }}
        >
          Přidat se
        </Link>
      </MainButton>
    )
  }

  if (membership?.status === "active" && membership.role === "admin") {
    return (
      <MainButton asChild>
        <Link
          to="/skupiny/$groupId/sprava"
          params={{ groupId: group.id }}
        >
          Spravovat skupinu
        </Link>
      </MainButton>
    )
  }

  if (membership?.status === "active") {
    return (
      <div className="flex flex-col gap-2">
        <Alert variant="neutral">
          <Info aria-hidden />
          <AlertTitle>Jsi členem skupiny</AlertTitle>
        </Alert>
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full"
          disabled={leave.isPending}
          onClick={() => leave.mutate(undefined, { onError: showError })}
        >
          {leave.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
          Odejít ze skupiny
        </Button>
      </div>
    )
  }

  if (membership?.status === "pending") {
    return (
      <div className="flex flex-col gap-2">
        <Alert variant="info">
          <Info aria-hidden />
          <AlertTitle>Žádost čeká na schválení</AlertTitle>
          <AlertDescription>{approverSentence(group.admins)}</AlertDescription>
        </Alert>
        {/* a mistaken or reconsidered request is withdrawn before an admin decides */}
        <WithdrawRequestButton
          isPending={leave.isPending}
          onConfirm={() =>
            leave.mutate(undefined, {
              onSuccess: () => toast.success("Žádost je stažená"),
              onError: showError,
            })
          }
        />
      </div>
    )
  }

  const isClosed = group.type === "closed"
  return (
    <div className="flex flex-col gap-2">
      <MainButton
        disabled={join.isPending}
        onClick={() => join.mutate(undefined, { onError: showError })}
      >
        {join.isPending ? <Loader2 className="animate-spin" /> : null}
        {isClosed ? "Požádat o členství" : "Přidat se"}
      </MainButton>
      {isClosed ? (
        <p className="text-sm text-muted-foreground">Správce žádost schválí nebo zamítne.</p>
      ) : null}
    </div>
  )
}

/**
 * Whether the action bar has anything to show, so it isn't drawn empty: a
 * deactivated group shows its notice; a block (#63) leaves nothing.
 */
export const hasMembershipAction = (group: GroupDetail): boolean =>
  group.status !== "active" || group.viewerMembership?.status !== "blocked"

/**
 * Figma: „Správce Tomáš Dvořák ji schválí nebo zamítne.“ — reworded without
 * „Správce“ before the name, which reads wrong for „Lucie Svobodová“; the
 * app doesn't know anyone's gender.
 */
function approverSentence(admins: GroupDetail["admins"]): string {
  const [only] = admins
  return admins.length === 1 && only
    ? `Schválí nebo zamítne ji ${only.name}.`
    : "Schválí nebo zamítne ji správa skupiny."
}

function MainButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      size="lg"
      className="h-11 w-full"
      {...props}
    />
  )
}

/**
 * „Stáhnout žádost“, worded like withdrawing a request to join an event
 * (Figma A-05b) and confirmed the same way, so a stray tap doesn't drop it.
 */
function WithdrawRequestButton({
  isPending,
  onConfirm,
}: {
  isPending: boolean
  onConfirm: () => void
}) {
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
          className="h-11 w-full"
          // a second confirmation while the first is on its way would only fail
          disabled={isPending}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <X />}
          Stáhnout žádost
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stáhnout žádost o členství?</DialogTitle>
          <DialogDescription>
            Správce ji pak už neuvidí. O členství půjde kdykoli požádat znovu.
          </DialogDescription>
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
            Stáhnout žádost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
