import type { ComponentProps } from "react"
import { Link } from "@tanstack/react-router"
import { Info, Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
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
 * offers nothing (its notice is #54), nor does a block (#63).
 */
export function GroupMembershipAction({
  group,
  isSignedIn,
  signInFrom,
}: GroupMembershipActionProps) {
  const join = useJoinGroup(group.id)
  const leave = useLeaveGroup(group.id)
  const membership = group.viewerMembership

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
      <Alert variant="info">
        <Info aria-hidden />
        <AlertTitle>Žádost čeká na schválení</AlertTitle>
        <AlertDescription>{approverSentence(group.admins)}</AlertDescription>
      </Alert>
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

/** Whether the page has a main action at all, so it doesn't draw an empty action bar. */
export const hasMembershipAction = (group: GroupDetail): boolean =>
  group.status === "active" && group.viewerMembership?.status !== "blocked"

/** Figma: „Správce Tomáš Dvořák ji schválí nebo zamítne.“ */
function approverSentence(admins: GroupDetail["admins"]): string {
  const [only] = admins
  return admins.length === 1 && only
    ? `Správce ${only.name} ji schválí nebo zamítne.`
    : "Správce skupiny ji schválí nebo zamítne."
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
