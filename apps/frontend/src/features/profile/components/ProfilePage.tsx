import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Pencil } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { ActivityTag } from "@/components/ActivityTag/ActivityTag"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { initials } from "@/lib/initials"
import { PAGE } from "@/lib/pageLayout"
import { ratingSummaryLabel } from "@/lib/ratingSummary"
import { cn } from "@/lib/utils"

import {
  profileOverviewQueryOptions,
  profileQueryOptions,
} from "@/features/profile/api/profileQueryOptions"
import type { ProfileOverviewData, SelfProfile } from "@/features/profile/api/profileSchemas"

import { RatingsSection } from "./ProfileOverview"
import { ProfileError, ProfileLoading } from "./ProfileState"

/**
 * /profil (Figma B-05, B-05d): who I am and whom I know — the band, then the people I know
 * (#307) and my ratings. What I do (my events, my groups, the history) is in Moje (#367).
 * Editing is on /profil/upravit.
 */
export function ProfilePage({
  viewerId,
  peopleContent,
}: {
  viewerId: string
  /** „Lidé, které znám“, from the friends feature (the route puts it in, #307). */
  peopleContent?: ReactNode
}) {
  const profile = useQuery(profileQueryOptions(viewerId))
  const overview = useQuery(profileOverviewQueryOptions(viewerId))
  const error = profile.error ?? overview.error
  return (
    <>
      <Seo title="Můj profil" />
      {error ? (
        <>
          <PageBand title="Můj profil" />
          <div className={cn(PAGE, "pb-24")}>
            <ProfileError
              retry={() => {
                if (profile.error) void profile.refetch()
                if (overview.error) void overview.refetch()
              }}
            />
          </div>
        </>
      ) : !profile.data || !overview.data ? (
        <>
          <PageBand title="Můj profil" />
          <div className={cn(PAGE, "pb-24")}>
            <ProfileLoading />
          </div>
        </>
      ) : (
        <>
          <ProfileBand
            profile={profile.data}
            overview={overview.data}
          />
          <div className={cn(PAGE, "gap-12 pb-24")}>
            {peopleContent}
            <RatingsSection
              participant={{
                ratings: overview.data.participantRatings,
                summary: overview.data.participantSummary,
              }}
              organizer={{
                ratings: overview.data.organizerRatings,
                summary: overview.data.organizerSummary,
              }}
            />
          </div>
        </>
      )}
    </>
  )
}

/**
 * The page band (DESIGN.md › Layout): avatar, name as the H1, home locality and rating as a
 * participant, interests, and „Upravit profil“ as the page's main action.
 */
function ProfileBand({
  profile,
  overview,
}: {
  profile: SelfProfile
  overview: ProfileOverviewData
}) {
  return (
    <PageBand
      title={<span className="break-words">{profile.name}</span>}
      leading={
        // like the avatar in the header on the band (HeaderMenu)
        <Avatar
          aria-hidden="true"
          className="size-12 border border-on-hero-muted md:size-16"
        >
          <AvatarFallback className="bg-secondary text-body font-semibold text-secondary-foreground md:text-base">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
      }
      description={`${profile.homeLocality?.name ?? "Bez domovské lokality"} · ${ratingSummaryLabel(overview.participantSummary)}`}
      action={
        <Button
          asChild
          size="lg"
          // a phone has only the pencil beside the name; the label stays the link's name
          className="size-11 px-0 md:w-auto md:px-4"
        >
          <Link to={ROUTES.editProfile}>
            <Pencil />
            <span className="max-md:sr-only">Upravit profil</span>
          </Link>
        </Button>
      }
    >
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
    </PageBand>
  )
}
