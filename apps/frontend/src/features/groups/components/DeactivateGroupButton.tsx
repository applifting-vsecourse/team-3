import { useState } from "react"
import { Ban, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { cn } from "@/lib/utils"

import { useDeactivateGroup } from "@/features/groups/hooks/useGroupMutations"

type DeactivateGroupButtonProps = {
  groupId: string
  groupName: string
  onDeactivated: () => void
  className?: string
}

/**
 * „Deaktivovat skupinu“ with its confirmation (Figma D-07a): the group is
 * kept, not deleted, and it can't be undone, so the dialog says what happens.
 * Destructive only in the dialog (DESIGN.md).
 */
export function DeactivateGroupButton({
  groupId,
  groupName,
  onDeactivated,
  className,
}: DeactivateGroupButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const deactivate = useDeactivateGroup(groupId)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className={cn("h-11", className)}
        >
          <Ban />
          Deaktivovat skupinu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deaktivovat skupinu?</DialogTitle>
          <DialogDescription>
            {groupName} zmizí z hledání a nikdo nový se do ní nepřidá. Skupina se nemaže, členové i
            historie zůstanou.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              size="lg"
              className="h-11"
            >
              Zpět
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            className="h-11"
            // a second confirmation while the first is on its way would only fail
            disabled={deactivate.isPending}
            // mutateAsync, not mutate's callbacks: the refetched group is inactive, the
            // management page swaps this button for its notice and a callback of an
            // unmounted component would never run
            onClick={async () => {
              try {
                await deactivate.mutateAsync()
              } catch (error) {
                toast.error((error as Error).message)
                return
              }
              onDeactivated()
            }}
          >
            {deactivate.isPending ? <Loader2 className="animate-spin" /> : null}
            Deaktivovat skupinu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
