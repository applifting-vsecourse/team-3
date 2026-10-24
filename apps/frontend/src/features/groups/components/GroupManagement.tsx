import { useQuery } from "@tanstack/react-query"
import { Check, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

import { PersonRow } from "@/components/PersonRow/PersonRow"
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
 * Any admin approves or rejects a request; removing and blocking members
 * come with #63.
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

  if (requests.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">Žádné žádosti o členství teď nečekají.</p>
    )
  }

  return (
    <ul>
      {requests.map((request) => {
        // only the row being decided waits; the others stay usable
        const isDeciding = decide.isPending && decide.variables.userId === request.userId
        const handle = (decision: "approve" | "reject") =>
          decide.mutate(
            { userId: request.userId, decision },
            {
              onSuccess: () =>
                toast.success(
                  decision === "approve"
                    ? `${request.name} je členem skupiny`
                    : `Žádost od ${request.name} je zamítnutá`,
                ),
              onError: (error) => toast.error(error.message),
            },
          )
        return (
          <li
            key={request.userId}
            className="border-b border-border py-3"
          >
            <PersonRow
              name={request.name}
              description="Žádá o členství"
              actions={
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11"
                    disabled={isDeciding}
                    onClick={() => handle("reject")}
                  >
                    <X />
                    Zamítnout
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11"
                    disabled={isDeciding}
                    onClick={() => handle("approve")}
                  >
                    <Check />
                    Schválit
                  </Button>
                </>
              }
            />
          </li>
        )
      })}
    </ul>
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
