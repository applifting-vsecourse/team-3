import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ActivityTag } from "@/components/ActivityTag/ActivityTag"
import { Seo } from "@/components/Seo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { initials } from "@/lib/initials"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import {
  profileOverviewQueryOptions,
  profileQueryOptions,
} from "@/features/profile/api/profileQueryOptions"
import type { ProfileOverviewData, SelfProfile } from "@/features/profile/api/profileSchemas"
import { formatRatingSummary } from "@/features/profile/lib/formatRating"

import { EventSection, RatingsSection } from "./ProfileOverview"
import { ProfileError, ProfileLoading } from "./ProfileState"

/**
 * /profil (Figma B-05, B-05d): one overview of me — who I am, then Kam jdu,
 * Pořádám, Proběhlé, Moje skupiny and Hodnocení. Editing is on /profil/upravit.
 */
export function ProfilePage({
  viewerId,
  groupsContent,
}: {
  viewerId: string
  /** Moje skupiny, from the groups feature (the route puts it in). */
  groupsContent: ReactNode
}) {
  const profile = useQuery(profileQueryOptions(viewerId))
  const overview = useQuery(profileOverviewQueryOptions(viewerId))
  const error = profile.error ?? overview.error
  return (
    <>
      <Seo title="Můj profil" />
      <div className={cn(PAGE, "gap-8 pb-24")}>
        {error ? (
          <>
            <h1 className="type-title">Můj profil</h1>
            <ProfileError
              retry={() => {
                if (profile.error) void profile.refetch()
                if (overview.error) void overview.refetch()
              }}
            />
          </>
        ) : !profile.data || !overview.data ? (
          <>
            <h1 className="type-title">Můj profil</h1>
            <ProfileLoading />
          </>
        ) : (
          <>
            <ProfileHeader
              profile={profile.data}
              overview={overview.data}
            />
            <ProfileSections
              overview={overview.data}
              groupsContent={groupsContent}
            />
          </>
        )}
      </div>
    </>
  )
}

/**
 * Avatar, name, home locality, rating as a participant and interests. The page
 * band (PageBand, #253) takes this over once it is merged.
 */
function ProfileHeader({
  profile,
  overview,
}: {
  profile: SelfProfile
  overview: ProfileOverviewData
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-16">
            {/* Figma: Avatar — initials on the quiet brand fill, like PersonRow */}
            <AvatarFallback className="border border-tile-border bg-secondary text-lg font-semibold text-secondary-foreground">
              {initials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="type-title break-words">{profile.name}</h1>
            <p className="text-body text-muted-foreground">
              {profile.homeLocality?.name ?? "Bez domovské lokality"} ·{" "}
              {formatRatingSummary(overview.participantSummary)}
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="w-fit"
        >
          <Link to={ROUTES.editProfile}>Upravit profil</Link>
        </Button>
      </div>
      {profile.interests.length ? (
        <ul
          aria-label="Zájmy"
          className="flex flex-wrap gap-2"
        >
          {profile.interests.map((interest) => (
            <li key={interest.id}>
              <ActivityTag
                name={interest.name}
                className="border border-tile-border"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}

function ProfileSections({
  overview,
  groupsContent,
}: {
  overview: ProfileOverviewData
  groupsContent: ReactNode
}) {
  return (
    <>
      <div className="grid gap-8 md:grid-cols-3">
        <EventSection
          title="Kam jdu"
          events={overview.upcoming}
          total={overview.upcomingTotal}
          link={{ to: ROUTES.myEvents }}
          empty={
            <>
              <p>Zatím nejdeš na žádnou akci.</p>
              <Button
                asChild
                variant="outline"
              >
                <Link to={ROUTES.events}>Projít akce</Link>
              </Button>
            </>
          }
        />
        <EventSection
          title="Pořádám"
          events={overview.organizing}
          total={overview.organizingTotal}
          link={{ to: ROUTES.myEvents, search: { tab: "poradam" } }}
          empty={
            <>
              <p>Zatím žádnou akci nepořádáš.</p>
              <Button
                asChild
                variant="outline"
              >
                <Link
                  to={ROUTES.myEvents}
                  search={{ tab: "poradam" }}
                >
                  Založit akci v Moje akce
                </Link>
              </Button>
            </>
          }
        />
        <EventSection
          title="Proběhlé"
          events={overview.past}
          total={overview.pastTotal}
          hasBadge={false}
          empty={<p>Tady uvidíš proběhlé akce, na které máš schválenou účast.</p>}
        />
      </div>
      {groupsContent}
      <RatingsSection
        participant={{
          ratings: overview.participantRatings,
          summary: overview.participantSummary,
        }}
        organizer={{ ratings: overview.organizerRatings, summary: overview.organizerSummary }}
      />
    </>
  )
}
