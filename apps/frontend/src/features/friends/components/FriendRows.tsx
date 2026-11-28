import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { FriendPerson, FriendRequest } from "@/features/friends/api/friendsSchemas"
import { useFriendshipChange } from "@/features/friends/hooks/useFriendMutations"
import { interestsLine } from "@/features/friends/lib/friends"

const date = (value: Date) =>
  value.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })
const showError = (error: Error) => toast.error(error.message)

// rows under one another on a phone, two side by side from md (Figma B-05fd, B-09d)
export const ROWS = "grid grid-cols-1 gap-x-12 divide-y divide-border md:grid-cols-2 md:divide-y-0"
const ROW = "py-3 md:border-b md:border-border"

/** A friend: avatar, name to their profile, interests (Figma Person row, Member). */
export function FriendRow({ person, className }: { person: FriendPerson; className?: string }) {
  return (
    <li className={cn(ROW, className)}>
      <PersonRow
        name={person.name}
        userId={person.id}
        description={interestsLine(person)}
      />
    </li>
  )
}

/**
 * A request (Figma Person row, Request): waiting for me — „Odmítnout“ (quietly) and „Přijmout“;
 * mine — „Zrušit žádost“, also after a silent rejection (decided 18. 11.).
 */
export function FriendRequestRow({
  request,
  direction,
  onDecided,
}: {
  request: FriendRequest
  direction: "incoming" | "outgoing"
  /** What else to refresh once it's decided: the bell, whose upozornění on it is gone (#430). */
  onDecided?: () => Promise<unknown>
}) {
  const accept = useFriendshipChange("request", onDecided)
  const reject = useFriendshipChange("reject", onDecided)
  const cancel = useFriendshipChange("remove", onDecided)
  const isPending = accept.isPending || reject.isPending || cancel.isPending
  const { person } = request
  const isIncoming = direction === "incoming"
  return (
    <li className={ROW}>
      <PersonRow
        name={person.name}
        userId={person.id}
        description={
          isIncoming
            ? `Posílá ti žádost · ${date(request.requestedAt)}`
            : `Žádost odeslána ${date(request.requestedAt)}`
        }
        actions={
          isIncoming ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  reject.mutate(person.id, {
                    onSuccess: () => toast.success("Žádost odmítnuta."),
                    onError: showError,
                  })
                }
              >
                {reject.isPending ? <Loader2 className="animate-spin" /> : <X aria-hidden />}
                Odmítnout
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  accept.mutate(person.id, {
                    onSuccess: () => toast.success(`${person.name} je teď mezi přáteli.`),
                    onError: showError,
                  })
                }
              >
                {accept.isPending ? <Loader2 className="animate-spin" /> : <Check aria-hidden />}
                Přijmout
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-fit"
              disabled={isPending}
              onClick={() =>
                cancel.mutate(person.id, {
                  onSuccess: () => toast.success("Žádost je zrušená."),
                  onError: showError,
                })
              }
            >
              {cancel.isPending ? <Loader2 className="animate-spin" /> : <X aria-hidden />}
              Zrušit žádost
            </Button>
          )
        }
      />
    </li>
  )
}
