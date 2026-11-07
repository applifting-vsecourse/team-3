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
import { cn } from "@/lib/utils"

import {
  profileOverviewQueryOptions,
  profileQueryOptions,
} from "@/features/profile/api/profileQueryOptions"
import type { ProfileOverviewData, SelfProfile } from "@/features/profile/api/profileSchemas"
import { formatRatingSummary } from "@/features/profile/lib/formatRating"

import {
  EventSection,
  HighlightedTitle,
  RatingsSection,
  type RenderProfileEvent,
} from "./ProfileOverview"
import { ProfileError, ProfileLoading } from "./ProfileState"

/**
 * /profil (Figma B-05, B-05d): one overview of me — who I am in the band, then Kam jdu,
 * Pořádám, Proběhlé, Moje skupiny and Hodnocení. Editing is on /profil/upravit.
 */
export function ProfilePage({
  viewerId,
  groupsContent,
  renderEvent,
}: {
  viewerId: string
  /** Moje skupiny, from the groups feature (the route puts it in). */
  groupsContent: ReactNode
  /** The event cards, from the events feature (the route puts them in). */
  renderEvent: RenderProfileEvent
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
            <ProfileSections
              overview={overview.data}
              groupsContent={groupsContent}
              renderEvent={renderEvent}
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
      description={`${profile.homeLocality?.name ?? "Bez domovské lokality"} · ${formatRatingSummary(overview.participantSummary)}`}
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

function ProfileSections({
  overview,
  groupsContent,
  renderEvent,
}: {
  overview: ProfileOverviewData
  groupsContent: ReactNode
  renderEvent: RenderProfileEvent
}) {
  return (
    <>
      {/* three columns only where a row card fits in one (the badge and the bar beside it) */}
      <div className="grid gap-8 xl:grid-cols-3">
        <EventSection
          title={
            <HighlightedTitle
              before="Kam"
              keyword="jdu"
            />
          }
          section="upcoming"
          events={overview.upcoming}
          total={overview.upcomingTotal}
          link={{ to: ROUTES.myEvents }}
          renderEvent={renderEvent}
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
          title={
            <HighlightedTitle
              before="Co"
              keyword="pořádám"
            />
          }
          section="organizing"
          events={overview.organizing}
          total={overview.organizingTotal}
          link={{ to: ROUTES.myEvents, search: { tab: "poradam" } }}
          renderEvent={renderEvent}
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
          title={
            <HighlightedTitle
              keyword="Proběhlé"
              after="akce"
            />
          }
          section="past"
          events={overview.past}
          total={overview.pastTotal}
          renderEvent={renderEvent}
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
