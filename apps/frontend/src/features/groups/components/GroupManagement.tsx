import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

import { PersonRow } from "@/components/PersonRow/PersonRow"
import { formatRequestTime } from "@/components/RequestDecision/formatRequestTime"
import { RejectRequestDialog } from "@/components/RequestDecision/RejectRequestDialog"
import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import type { GroupMemberEntry } from "@/features/groups/api/groupSchemas"
import { groupMembersQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { useDecideRequest } from "@/features/groups/hooks/useGroupMutations"

type GroupManagementProps = {
  groupId: string
  /** Mobile (D-07): tabs Žádosti / Členové; desktop (D-07d): both lists at once. */
  isDesktop: boolean
}

/**
 * Requests and members of a group, for its admins (Figma D-07, D-07d).
 * Any admin approves or rejects a request, with the same steps, texts and
 * confirmation as an event's requests (D-03, #304); removing and blocking
 * members come with #63.
 */
export function GroupManagement({ groupId, isDesktop }: GroupManagementProps) {
  const membersQuery = useQuery(groupMembersQueryOptions(groupId))

  if (membersQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Členy a žádosti se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>Zkontroluj připojení a zkus to znovu.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void membersQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!membersQuery.data) {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy
        aria-label="Načítám členy a žádosti"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-3"
          >
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  const { requests, members } = membersQuery.data
  const requestsTitle = `Žádosti (${requests.length})`
  const membersTitle = `Členové (${members.length})`

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="group-requests"
          className="flex flex-col gap-2"
        >
          <h2
            id="group-requests"
            className="text-lg font-semibold tracking-tight"
          >
            {requestsTitle}
          </h2>
          <RequestList
            groupId={groupId}
            requests={requests}
          />
        </section>
        <section
          aria-labelledby="group-members"
          className="flex flex-col"
        >
          <h2
            id="group-members"
            className="text-lg font-semibold tracking-tight"
          >
            {membersTitle}
          </h2>
          <MemberList members={members} />
        </section>
      </div>
    )
  }

  return (
    <Tabs defaultValue="requests">
      <TabBar>
        <TabBarItem value="requests">{requestsTitle}</TabBarItem>
        <TabBarItem value="members">{membersTitle}</TabBarItem>
      </TabBar>
      <TabsContent value="requests">
        <RequestList
          groupId={groupId}
          requests={requests}
        />
      </TabsContent>
      <TabsContent value="members">
        <MemberList members={members} />
      </TabsContent>
    </Tabs>
  )
}

function RequestList({ groupId, requests }: { groupId: string; requests: GroupMemberEntry[] }) {
  const decide = useDecideRequest(groupId)
  // kept after closing, so the dialog's text doesn't vanish while it fades out
  const [rejecting, setRejecting] = useState<GroupMemberEntry | null>(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  // the focus comes back here after a rejection: the rejected row is gone (review #318)
  const listRef = useRef<HTMLDivElement>(null)
  // only the row being decided waits; the others stay usable (review #318)
  const isDeciding = (request: GroupMemberEntry) =>
    decide.isPending && decide.variables.userId === request.userId

  // the same toasts as an event's requests (#304); the API's message says why it failed
  const handle = (request: GroupMemberEntry, decision: "approve" | "reject") =>
    decide.mutateAsync({ userId: request.userId, decision }).then(
      () =>
        toast.success(
          decision === "approve" ? `Schváleno: ${request.name}` : `Zamítnuto: ${request.name}`,
        ),
      (error: Error) => {
        toast.error(error.message)
        throw error
      },
    )

  return (
    <div
      ref={listRef}
      tabIndex={-1}
      className="outline-none"
    >
      {requests.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Žádné žádosti o členství teď nečekají.</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li
              key={request.userId}
              className="border-b border-border py-3"
            >
              <PersonRow
                name={request.name}
                description={formatRequestTime(request.since)}
                quote={request.message}
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11"
                      // a decision on this request is on its way: a second one would only fail
                      disabled={isDeciding(request)}
                      aria-label={`Zamítnout žádost: ${request.name}`}
                      onClick={() => {
                        setRejecting(request)
                        setIsRejectOpen(true)
                      }}
                    >
                      <X />
                      Zamítnout
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11"
                      disabled={isDeciding(request)}
                      aria-label={`Schválit žádost: ${request.name}`}
                      onClick={() =>
                        handle(request, "approve").catch(() => {
                          // the toast says why
                        })
                      }
                    >
                      <Check />
                      Schválit
                    </Button>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {/* outside the list: rejecting the last request doesn't unmount it mid-confirmation */}
      <RejectRequestDialog
        isOpen={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        isPending={rejecting !== null && isDeciding(rejecting)}
        fallbackFocusRef={listRef}
        // a rejected request is removed, so they may ask again (#46)
        description={`${rejecting?.name ?? ""} uvidí na stránce skupiny zase „Požádat o členství“ a o členství může požádat znovu.`}
        onConfirm={() => (rejecting ? handle(rejecting, "reject") : Promise.resolve())}
      />
    </div>
  )
}

function MemberList({ members }: { members: GroupMemberEntry[] }) {
  return (
    <ul>
      {members.map((member) => (
        <li
          key={member.userId}
          className="border-b border-border py-3"
        >
          <PersonRow
            name={member.name}
            description={member.role === "admin" ? "Správce skupiny" : "Člen skupiny"}
          />
        </li>
      ))}
    </ul>
  )
}
