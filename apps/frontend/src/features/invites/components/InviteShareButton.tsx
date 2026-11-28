import { useQuery } from "@tanstack/react-query"
import { Send } from "lucide-react"

import { ShareLinkButton } from "@/components/ShareLinkButton/ShareLinkButton"
import { Button } from "@/components/ui/button"

import { myInviteQueryOptions } from "@/features/invites/api/invitesQueryOptions"
import { inviteShareText } from "@/features/invites/lib/invite"

const LABEL = "Poslat pozvánku"

/**
 * „Poslat pozvánku“ on its own, for the empty friends (#474): the same sharing as „Pozvi
 * kamaráda“ on Můj profil — the phone's share sheet with `inviteShareText`, on desktop (where
 * the share sheet tends to be poor) a copy of the link with a toast. The field with the link
 * stays on the profile. Until my link is there the button waits, disabled.
 */
export function InviteShareButton({
  viewerId,
  interests,
}: {
  viewerId: string
  /** My interests, for the share message („Hledám parťáky na volejbal…“). */
  interests: string[]
}) {
  const invite = useQuery(myInviteQueryOptions(viewerId))
  if (!invite.data) {
    return (
      <Button
        variant="outline"
        size="lg"
        disabled
      >
        <Send aria-hidden />
        {LABEL}
      </Button>
    )
  }
  const shared = {
    path: invite.data.url,
    title: "Pozvánka na HobbyHub",
    text: inviteShareText(interests),
    label: LABEL,
    variant: "outline",
    icon: Send,
  } as const
  return (
    <>
      <ShareLinkButton
        {...shared}
        shouldUseShareSheet
        className="md:hidden"
      />
      <ShareLinkButton
        {...shared}
        className="hidden md:inline-flex"
      />
    </>
  )
}
