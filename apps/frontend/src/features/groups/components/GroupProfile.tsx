import type { ReactNode } from "react"

import { ROUTES } from "@/app/routes"
import { ActivityPhoto } from "@/components/ActivityPhoto/ActivityPhoto"
import type { BackLinkProps } from "@/components/BackLink/BackLink"
import { BandActivity } from "@/components/PageBand/BandActivity"
import { PageBand } from "@/components/PageBand/PageBand"
import { SubBar } from "@/components/PageBand/SubBar"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { PAGE } from "@/lib/pageLayout"

import type { GroupDetail } from "@/features/groups/api/groupSchemas"
import {
  GroupMembershipAction,
  hasMembershipAction,
} from "@/features/groups/components/GroupMembershipAction"
import { GroupFacts } from "@/features/groups/components/GroupSummary"
import { groupBandLine } from "@/features/groups/lib/formatGroup"

type GroupProfileProps = {
  group: GroupDetail
  isSignedIn: boolean
  /** Login's `from`, so a visitor who signs in to join comes back to the group. */
  signInFrom: string
  /** The group's upcoming and past events (#70, A-08e); the page builds them. */
  events?: ReactNode
  /** The admins' announcements (#194, A-08e), only for members; the page builds them. */
  announcements?: ReactNode
}

/** Back to the list of groups — the group page and its loading or error states. */
export const GROUPS_BACK: Omit<BackLinkProps, "isIconOnlyOnMobile"> = {
  to: ROUTES.groups,
  fallbackLabel: "Všechny skupiny",
  label: "Skupiny",
}

/**
 * The group page, laid out as the event detail (Figma A-08, A-08d): the band
 * with the activity, the name and one line — type, locality, members — and
 * the activity's photo (without a date) under the bar on a phone, at the top
 * of the content on desktop. Then the facts, admins and description; mobile
 * stacks them with the action in a bar above the bottom navigation, desktop
 * puts the facts and the action in a panel on the right. A member sees the
 * announcements after the description, then the group's events (A-08e); on
 * desktop the admins follow the events (A-08ed).
 */
export function GroupProfile({
  group,
  isSignedIn,
  signInFrom,
  events,
  announcements,
}: GroupProfileProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const action = hasMembershipAction(group) ? (
    <GroupMembershipAction
      group={group}
      isSignedIn={isSignedIn}
      signInFrom={signInFrom}
    />
  ) : null

  const line = groupBandLine(group)
  const band = (
    <PageBand
      variant="detail"
      back={GROUPS_BACK}
      title={group.name}
      eyebrow={<BandActivity activity={group.activity} />}
      description={isDesktop ? line : undefined}
    >
      {/* a phone keeps the line in the band too (A-08), unlike the event detail */}
      {isDesktop ? null : <p className="text-body text-on-hero-muted">{line}</p>}
    </PageBand>
  )
  const photo = <ActivityPhoto slug={group.activity.slug} />

  if (isDesktop) {
    return (
      <>
        {band}
        <div className={PAGE}>
          <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-12">
            <div className="flex flex-col gap-6">
              {photo}
              <GroupAbout description={group.description} />
              {announcements}
              {events}
              {/* A-08ed: on desktop who runs the group comes after its events */}
              <GroupAdmins admins={group.admins} />
            </div>
            {/* Figma: Panel skupiny */}
            <div className="flex w-100 flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 text-card-foreground">
              <GroupFacts group={group} />
              {action}
            </div>
          </article>
        </div>
      </>
    )
  }

  return (
    <>
      <SubBar
        back={GROUPS_BACK}
        label="Skupina"
      />
      {photo}
      {band}
      <article className="flex flex-col gap-5 px-4 pt-5">
        <GroupFacts group={group} />
        <GroupAdmins admins={group.admins} />
        <GroupAbout description={group.description} />
        {announcements}
        {events}
        {action ? (
          // Figma: Lišta s akcí — above the bottom navigation
          <div className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-3">
            {action}
          </div>
        ) : null}
      </article>
    </>
  )
}

function GroupAdmins({ admins }: { admins: GroupDetail["admins"] }) {
  return (
    <section
      aria-labelledby="group-admins"
      className="flex flex-col gap-1"
    >
      <h2
        id="group-admins"
        className="text-caption font-medium text-muted-foreground"
      >
        Spravuje
      </h2>
      <ul>
        {admins.map((admin) => (
          <li
            key={admin.id}
            // Figma: Person row ends with a hairline
            className="border-b border-border py-3"
          >
            <PersonRow
              name={admin.name}
              userId={admin.id}
              description="Správce skupiny"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function GroupAbout({ description }: { description: string | null }) {
  if (!description) return null
  return (
    <section
      aria-labelledby="group-about"
      className="flex flex-col gap-2"
    >
      <h2
        id="group-about"
        className="type-card-heading"
      >
        O skupině
      </h2>
      <p className="text-body whitespace-pre-line">{description}</p>
    </section>
  )
}
