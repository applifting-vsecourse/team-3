import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Copy, Send } from "lucide-react"
import { toast } from "sonner"

import { ShareLinkButton } from "@/components/ShareLinkButton/ShareLinkButton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

import { myInviteQueryOptions } from "@/features/invites/api/invitesQueryOptions"
import { useRegenerateInvite } from "@/features/invites/hooks/useInviteMutations"
import { inviteShareText, joinedLine } from "@/features/invites/lib/invite"

/**
 * „Pozvi kamaráda“ on Můj profil (#406, brief §4), under „Lidé, které znám“: a block on the
 * page, no card. „Poslat pozvánku“ opens the phone's share sheet with a message or copies the
 * link; on desktop the link itself with „Kopírovat“ beside it. „Vytvořit nový odkaz“ replaces
 * the code after a confirmation.
 */
export function InviteFriendSection({
  viewerId,
  interests,
}: {
  viewerId: string
  /** My interests, for the share message („Hledám parťáky na volejbal…“). */
  interests: string[]
}) {
  const invite = useQuery(myInviteQueryOptions(viewerId))
  const headingId = useId()
  const linkId = useId()
  const [isConfirming, setIsConfirming] = useState(false)

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Odkaz je zkopírovaný.")
    } catch {
      toast.error("Odkaz se nepodařilo zkopírovat.")
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h3
        id={headingId}
        className="type-card-heading"
      >
        Pozvi kamaráda
      </h3>
      <p className="text-body text-muted-foreground">
        Kdo se přidá přes tvůj odkaz, tě bude mít rovnou v přátelích.
      </p>
      {invite.error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2"
        >
          <p className="text-sm">Odkaz s pozvánkou se nepodařilo načíst.</p>
          <Button
            variant="outline"
            onClick={() => void invite.refetch()}
          >
            Zkusit znovu
          </Button>
        </div>
      ) : !invite.data ? (
        <Skeleton
          role="status"
          aria-label="Načítám odkaz s pozvánkou"
          className="h-10 w-48"
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <ShareLinkButton
              path={invite.data.url}
              title="Pozvánka na HobbyHub"
              text={inviteShareText(interests)}
              label="Poslat pozvánku"
              variant="outline"
              icon={Send}
              shouldUseShareSheet
              className="md:hidden"
            />
            <div className="hidden min-w-0 flex-1 flex-col gap-2 md:flex md:max-w-md">
              <Label htmlFor={linkId}>Tvůj odkaz</Label>
              <Input
                id={linkId}
                readOnly
                value={invite.data.url}
                onFocus={(event) => event.currentTarget.select()}
                className="h-10"
              />
            </div>
            <Button
              variant="outline"
              size="lg"
              className="hidden md:inline-flex"
              onClick={() => void copy(invite.data.url)}
            >
              <Copy /> Kopírovat
            </Button>
          </div>
          {invite.data.joinedCount > 0 ? (
            <p className="text-caption text-muted-foreground">
              {joinedLine(invite.data.joinedCount)}
            </p>
          ) : null}
          <Button
            variant="link"
            className="min-h-10 w-fit px-0 text-muted-foreground"
            onClick={() => setIsConfirming(true)}
          >
            Vytvořit nový odkaz
          </Button>
          <RegenerateDialog
            viewerId={viewerId}
            isOpen={isConfirming}
            onClose={() => setIsConfirming(false)}
          />
        </>
      )}
    </section>
  )
}

function RegenerateDialog({
  viewerId,
  isOpen,
  onClose,
}: {
  viewerId: string
  isOpen: boolean
  onClose: () => void
}) {
  const regenerate = useRegenerateInvite(viewerId)
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        if (!isNowOpen && !regenerate.isPending) {
          regenerate.reset()
          onClose()
        }
      }}
    >
      <DialogContent className="border-card-border">
        <DialogTitle>Vytvořit nový odkaz?</DialogTitle>
        <DialogDescription>
          Starý odkaz hned přestane platit. Kdo ho ještě nepoužil, potřebuje od tebe ten nový.
        </DialogDescription>
        {regenerate.isError ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {regenerate.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={regenerate.isPending}
            onClick={onClose}
          >
            Zrušit
          </Button>
          <Button
            disabled={regenerate.isPending}
            onClick={() =>
              regenerate.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Nový odkaz je připravený.")
                  onClose()
                },
              })
            }
          >
            {regenerate.isPending ? "Vytvářím…" : "Vytvořit nový odkaz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
