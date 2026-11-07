import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { Skeleton } from "@/components/ui/skeleton"

import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupCard } from "@/features/groups/components/GroupCard"
import {
  GroupMembershipAction,
  hasMembershipAction,
} from "@/features/groups/components/GroupMembershipAction"

type MembersOnlyEventProps = {
  groupId: string
  viewerId: string | null | undefined
  signInFrom: string
  /** The viewer just became a member: the event can be loaded again, now with everything. */
  onMember: () => void
}

/**
 * Figma A-05i (#70, B-026): a members-only event opened by someone outside
 * its group. The API tells only which group it is, so nothing about the
 * event shows — just who organizes it and the way into the group: „Přidat se
 * ke skupině“, or „Požádat o členství“ for a closed one.
 */
export function MembersOnlyEvent({
  groupId,
  viewerId,
  signInFrom,
  onMember,
}: MembersOnlyEventProps) {
  const groupQuery = useQuery(groupQueryOptions(groupId, viewerId))
  const group = groupQuery.data
  const isMember = group?.viewerMembership?.status === "active"

  useEffect(() => {
    if (isMember) onMember()
  }, [isMember, onMember])

  if (!group) {
    return (
      <div
        aria-busy
        aria-label="Načítám akci"
        className="flex flex-col gap-5"
      >
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Akce jen pro členy skupiny
        </h1>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <article className="flex flex-col gap-5 md:max-w-xl">
      <header className="flex flex-col gap-5 md:gap-6">
        <div className="flex items-center gap-3">
          <ActivityTile icon={group.activity.category.icon} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{group.activity.name}</span>
            <span className="text-sm text-muted-foreground">{group.activity.category.name}</span>
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Akce jen pro členy skupiny
        </h1>
      </header>
      <p>
        Tuhle akci pořádá skupina {group.name} pro své členy. Přidej se ke skupině a uvidíš ji se
        všemi údaji.
      </p>
      <GroupCard
        group={group}
        titleAs="h2"
      />
      {hasMembershipAction(group) ? (
        <div className="flex flex-col gap-2">
          <GroupMembershipAction
            group={group}
            isSignedIn={viewerId !== null && viewerId !== undefined}
            signInFrom={signInFrom}
            joinLabel="Přidat se ke skupině"
          />
          <p className="text-sm text-muted-foreground">
            Akce skupiny „jen pro členy“ nejsou v hledání, na mapě ani na úvodní stránce.
          </p>
        </div>
      ) : null}
    </article>
  )
}
