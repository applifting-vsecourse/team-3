import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { ManagementSteps } from "@/components/ManagementSteps/ManagementSteps"
import { BandActivity } from "@/components/PageBand/BandActivity"
import { PageBand } from "@/components/PageBand/PageBand"
import { SubBar } from "@/components/PageBand/SubBar"
import { Seo } from "@/components/Seo"
import { ShareLinkButton } from "@/components/ShareLinkButton/ShareLinkButton"
import { Button } from "@/components/ui/button"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import {
  groupMembersQueryOptions,
  groupQueryOptions,
} from "@/features/groups/api/groupsQueryOptions"
import { AdminOnlyNotice } from "@/features/groups/components/AdminOnlyNotice"
import { CatalogState } from "@/features/groups/components/CatalogState"
import { DeactivateGroupButton } from "@/features/groups/components/DeactivateGroupButton"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { GroupManagement } from "@/features/groups/components/GroupManagement"
import { InactiveGroupNotice } from "@/features/groups/components/InactiveGroupNotice"
import { SendAnnouncementButton } from "@/features/groups/components/SendAnnouncementButton"
import { useOpenSavedGroup } from "@/features/groups/hooks/useOpenSavedGroup"
import { groupBandLine } from "@/features/groups/lib/formatGroup"
import { groupEmptySteps, groupNextStep } from "@/features/groups/lib/manageGroup"

export const Route = createFileRoute("/_ProtectedPages/skupiny/$groupId/sprava")({
  component: ManageGroupPage,
})

/** The group's page, shared to invite people (#371). */
const groupPath = (groupId: string) =>
  ROUTES.groupDetail.replace("$groupId", encodeURIComponent(groupId))

/**
 * Figma D-07 (mobile) and D-07d (desktop), the admin's entry from the group
 * page: requests and members (#46), editing and deactivation (#54). A
 * deactivated group is read-only, so its management is closed.
 *
 * Desktop starts with the band, as the group page (A-08d): the activity, the name and one
 * line ending „Spravuješ ty“. A phone has no band: the bar „Správa skupiny“. Then, on both
 * (#371): the group's card with its photo and one next step — decide the waiting requests,
 * invite people while the admin is alone, or write to the members. One tree for a phone and
 * desktop, only CSS rearranges it, so an open dialog survives crossing 768 px (#316).
 */
function ManageGroupPage() {
  const { groupId } = Route.useParams()
  const session = useSession()
  const user = session.user
  // undefined while the session loads; a failed check counts as a visitor
  const viewerId = session.isPending ? undefined : (user?.id ?? null)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const groupQuery = useQuery(groupQueryOptions(groupId, viewerId))
  const group = groupQuery.data
  const isAdmin =
    group?.viewerMembership?.role === "admin" && group.viewerMembership.status === "active"
  const openSavedGroup = useOpenSavedGroup()
  const isManaging = group !== undefined && group.status !== "inactive" && isAdmin
  // the same query as the lists below: one request, shared from the cache
  const membersQuery = useQuery({ ...groupMembersQueryOptions(groupId), enabled: isManaging })
  const nextStep = membersQuery.data
    ? groupNextStep(membersQuery.data.requests.length, membersQuery.data.members.length)
    : null
  const back = {
    to: "/skupiny/$groupId",
    params: { groupId },
    fallbackLabel: "Stránka skupiny",
  } as const
  const onDeactivated = () => {
    toast.success("Skupina je deaktivovaná")
    // replace, as after founding and editing (#187): „Zpět“ on the group page must not
    // lead back to the management of a group that is no longer active (#242)
    openSavedGroup(groupId)
  }

  return (
    <>
      <Seo title="Správa skupiny" />
      {isManaging ? (
        isDesktop ? (
          <PageBand
            variant="detail"
            back={back}
            title={group.name}
            eyebrow={<BandActivity activity={group.activity} />}
            // Figma D-07d: „Neveřejná skupina · Praha 9 · 5 členů · Spravuješ ty“
            description={`${groupBandLine(group)} · Spravuješ ty`}
          />
        ) : (
          <SubBar
            back={back}
            label="Správa skupiny"
            isHeading
          />
        )
      ) : null}
      <div className={cn(PAGE, "gap-4")}>
        {isManaging ? null : <BackLink {...back} />}
        {group?.status === "inactive" ? (
          <InactiveGroupNotice />
        ) : group && !isAdmin ? (
          <AdminOnlyNotice groupId={groupId} />
        ) : group ? (
          // D-07d: the group as others see it and the next step on the left, requests and
          // members on the right; a phone stacks them, the group's actions at the bottom (D-07)
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-12 md:gap-y-5">
            <section className="flex flex-col gap-5">
              {/* its photo too (#77); its place, type and members are on the card and in the band */}
              <GroupCard group={group} />
              {nextStep ? (
                <div className="flex flex-col gap-3">
                  <p>{nextStep.text}</p>
                  {nextStep.action === "invite" ? (
                    <ShareLinkButton
                      path={groupPath(groupId)}
                      title={group.name}
                      label="Pozvat do skupiny"
                      variant="default"
                      // a phone's share sheet; desktop copies the link
                      shouldUseShareSheet={!isDesktop}
                      className="h-11 w-full"
                    />
                  ) : nextStep.action === "write" && viewerId ? (
                    <SendAnnouncementButton
                      groupId={groupId}
                      viewerId={viewerId}
                      memberCount={group.memberCount}
                      variant="default"
                      className="w-full"
                    />
                  ) : null}
                </div>
              ) : null}
            </section>
            <div className="md:col-start-2 md:row-span-2 md:row-start-1">
              <GroupManagement
                groupId={groupId}
                aloneNextStep={
                  <ManagementSteps
                    steps={groupEmptySteps(group.type)}
                    link={{
                      path: groupPath(groupId),
                      title: group.name,
                      label: "Odkaz na skupinu",
                    }}
                  />
                }
              />
            </div>
            {/* the group's actions: under the card on desktop (D-07d), at the bottom on a
                phone (D-07) — the same buttons, moved by CSS alone (#316) */}
            <div className="flex flex-col gap-2 py-4 md:col-start-1 md:row-start-2 md:flex-row md:flex-wrap md:py-0">
              {/* Figma D-07, D-07d: „Napsat členům“ opens D-08 (#194), unless it is the next step */}
              {viewerId && nextStep && nextStep.action !== "write" && group.memberCount > 1 ? (
                <SendAnnouncementButton
                  groupId={groupId}
                  viewerId={viewerId}
                  memberCount={group.memberCount}
                  className="w-full md:w-auto"
                />
              ) : null}
              {/* until the members are here the primary button is unknown: no button appears
                  only to move away (review #382) */}
              {nextStep && nextStep.action !== "invite" ? (
                <ShareLinkButton
                  path={groupPath(groupId)}
                  title={group.name}
                  label="Pozvat do skupiny"
                  shouldUseShareSheet={!isDesktop}
                  variant="outline"
                  className="h-11 w-full md:w-auto"
                />
              ) : null}
              <EditButton
                groupId={groupId}
                className="w-full md:w-auto"
              />
              <DeactivateGroupButton
                groupId={groupId}
                groupName={group.name}
                onDeactivated={onDeactivated}
                className="w-full md:w-auto"
              />
            </div>
          </div>
        ) : (
          <CatalogState
            queries={[groupQuery]}
            errorTitle="Skupinu se nepodařilo načíst"
          />
        )}
      </div>
    </>
  )
}

function EditButton({ groupId, className }: { groupId: string; className?: string }) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn("h-11", className)}
    >
      <Link
        to="/skupiny/$groupId/upravit"
        params={{ groupId }}
      >
        <Pencil />
        Upravit skupinu
      </Link>
    </Button>
  )
}
