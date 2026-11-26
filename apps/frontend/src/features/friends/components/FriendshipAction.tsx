import { useState, type ComponentProps } from "react"
import { Link } from "@tanstack/react-router"
import { Check, ChevronDown, Info, Loader2, UserCheck, UserMinus, UserPlus, X } from "lucide-react"
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { FriendshipState } from "@/features/friends/api/friendsSchemas"
import { useFriendshipChange } from "@/features/friends/hooks/useFriendMutations"

type FriendshipActionProps = {
  userId: string
  /** The person's name, for the toasts and the dialog. */
  name: string
  /** How the viewer stands to them; null for a visitor. */
  state: FriendshipState | null
  /** Login's `from`, so a visitor who signs in to add a friend comes back to the profile. */
  signInFrom: string
  /** Refreshes the profile (its state and Kam jde): the route's, it belongs to another feature. */
  onChanged?: () => Promise<unknown>
}

const showError = (error: Error) => toast.error(error.message)

/**
 * The one block under a profile's name by the viewer's relation (Figma B-07 · Stavy tlačítka
 * přátelství, #307), laid out like the group's button (A-08): a notice and a button. One request
 * per pair: when they already ask me, „Přidat do přátel“ isn't offered, „Přijmout žádost“ is. A
 * rejection is silent; removing a friend asks first (B-07h).
 */
export function FriendshipAction({
  userId,
  name,
  state,
  signInFrom,
  onChanged,
}: FriendshipActionProps) {
  const request = useFriendshipChange("request", onChanged)
  const reject = useFriendshipChange("reject", onChanged)
  const remove = useFriendshipChange("remove", onChanged)
  const isPending = request.isPending || reject.isPending || remove.isPending

  if (state === "self") return null

  if (state === null) {
    return (
      <MainButton asChild>
        <Link
          to={ROUTES.login}
          search={{ from: signInFrom }}
        >
          <UserPlus aria-hidden />
          Přidat do přátel
        </Link>
      </MainButton>
    )
  }

  const sendRequest = () =>
    request.mutate(userId, {
      onSuccess: (next) =>
        toast.success(next === "friends" ? `${name} je teď mezi přáteli.` : "Žádost odeslána."),
      onError: showError,
    })

  if (state === "friends") {
    return (
      <RemoveFriendButton
        name={name}
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(userId, {
            onSuccess: () => toast.success("Odebráno z přátel."),
            onError: showError,
          })
        }
      />
    )
  }

  if (state === "outgoing") {
    return (
      <div className="flex flex-col gap-2">
        <Alert variant="info">
          <Info aria-hidden />
          <AlertTitle>Žádost odeslána</AlertTitle>
          <AlertDescription>Až ji přijme, uvidíš, kam chodí.</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full"
          disabled={isPending}
          onClick={() =>
            remove.mutate(userId, {
              onSuccess: () => toast.success("Žádost je zrušená."),
              onError: showError,
            })
          }
        >
          {remove.isPending ? <Loader2 className="animate-spin" /> : <X aria-hidden />}
          Zrušit žádost
        </Button>
      </div>
    )
  }

  if (state === "incoming") {
    return (
      <div className="flex flex-col gap-2">
        <Alert variant="info">
          <Info aria-hidden />
          <AlertTitle>Posílá ti žádost o přátelství</AlertTitle>
          <AlertDescription>Když ji přijmeš, uvidíte navzájem, kam chodíte.</AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            disabled={isPending}
            onClick={() =>
              reject.mutate(userId, {
                onSuccess: () => toast.success("Žádost odmítnuta."),
                onError: showError,
              })
            }
          >
            {reject.isPending ? <Loader2 className="animate-spin" /> : <X aria-hidden />}
            Odmítnout
          </Button>
          <Button
            size="lg"
            className="h-11"
            disabled={isPending}
            onClick={sendRequest}
          >
            {request.isPending ? <Loader2 className="animate-spin" /> : <Check aria-hidden />}
            Přijmout žádost
          </Button>
        </div>
      </div>
    )
  }

  return (
    <MainButton
      disabled={isPending}
      onClick={sendRequest}
    >
      {request.isPending ? <Loader2 className="animate-spin" /> : <UserPlus aria-hidden />}
      Přidat do přátel
    </MainButton>
  )
}

/** „Odebrat z přátel“, confirmed first (Figma B-07h), so a stray tap doesn't drop a friend. */
function RemoveFriendButton({
  name,
  isPending,
  onConfirm,
}: {
  name: string
  isPending: boolean
  onConfirm: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  // PO 26. 11. („Jste přátelé a Odebrat z přátel takhle fakt není moc pěkné“): one quiet
  // button that says the state, removing tucked in its menu, still confirmed in the dialog
  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <UserCheck aria-hidden />}
            Přátelé
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setIsOpen(true)}
          >
            <UserMinus aria-hidden />
            Odebrat z přátel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odebrat z přátel?</DialogTitle>
          <DialogDescription>
            Přestanete vidět, kam chodíte. {name} se o tom nedozví a přidat se můžete znovu.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zpět</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              onConfirm()
              setIsOpen(false)
            }}
          >
            Odebrat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
