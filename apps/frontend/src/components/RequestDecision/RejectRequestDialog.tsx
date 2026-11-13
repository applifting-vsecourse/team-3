import { Loader2 } from "lucide-react"

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

type RejectRequestDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** What the applicant will see afterwards; differs for an event and a group. */
  description: string
  /** The rejection is on its way: the dialog can't be confirmed twice or closed. */
  isPending: boolean
  /**
   * Resolves once the rejection is saved, and the dialog closes; rejects when it
   * isn't (the page's toast says why), and the dialog stays open to try again.
   */
  onConfirm: () => Promise<unknown>
}

/**
 * „Zamítnout žádost?“ (Figma D-03a, #185): rejecting can't be taken back, so it asks
 * first and says what the applicant will see. The same for the requests of an event
 * and of a group (#304); approving is one click in both.
 */
export function RejectRequestDialog({
  isOpen,
  onOpenChange,
  description,
  isPending,
  onConfirm,
}: RejectRequestDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNowOpen) => {
        // while the rejection is on its way, Esc, a click outside and the ✕ wait for
        // the answer: closing would hide whether it went through (review #262)
        if (!isNowOpen && isPending) return
        onOpenChange(isNowOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zamítnout žádost?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={isPending}
            >
              Zpět
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            // a second rejection while the first is on its way would only fail
            disabled={isPending}
            onClick={async () => {
              try {
                await onConfirm()
                onOpenChange(false)
              } catch {
                // the page's toast says why; the dialog stays to try again
              }
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Zamítnout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
