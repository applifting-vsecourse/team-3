import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { HomeSection } from "@/components/HomeSection/HomeSection"
import { PageBand } from "@/components/PageBand/PageBand"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { LocalityState } from "@/hooks/useLocality"
import { localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { ALL_LOCALITIES_SLUG } from "@/lib/catalog/localityOptions"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { HOME_WHOLE_COUNTRY, homeQueryOptions } from "@/features/events/api/homeQueryOptions"
import type {
  Home,
  HomeEventSection,
  HomeEventSectionKey,
  HomeGroupsSection,
} from "@/features/events/api/homeSchemas"
import { EventCardSkeleton } from "@/features/events/components/EventList"
import { HomeEventGrid } from "@/features/events/components/HomeEventGrid"
import { HowItWorks } from "@/features/events/components/HowItWorks"
import { LandingLocality } from "@/features/events/components/LandingLocality"
import {
  EmptyMissingOnePanel,
  MissingOnePanel,
  MissingOnePanelError,
  MissingOnePanelSkeleton,
} from "@/features/events/components/MissingOnePanel"
import { NothingForYou } from "@/features/events/components/NothingForYou"
import { PickedForYou, type QuickPick } from "@/features/events/components/PickedForYou"
import type { Radius } from "@/features/events/lib/eventsSearch"
import { areaPhrase, isoDay, weekendDays, weekendLabel } from "@/features/events/lib/homeCopy"
import { widenedOkoli } from "@/features/events/lib/widenedOkoli"

const VISITOR_TITLE = (
  <>
    Někde chybí jeden do party. <span className="block text-primary">Třeba ty.</span>
  </>
)

const SIGNED_IN_TITLE = (
  <>
    <span className="block">Tady se</span> <span className="block text-primary">na tebe čeká.</span>
  </>
)

type LandingViewProps = {
  /**
   * Undefined while the session loads. The title speaks to who is here (docs/ux-audit.md ›
   * Hlas aplikace), never by name; until the session is known it keeps its place but stays
   * hidden, and the sections wait, so a signed-in user never sees the visitor's page first.
   */
  isSignedIn: boolean | undefined
  /** Part of the sections' cache key: each user gets their own. */
  viewerId: string | null
  /**
   * The page's locality (useLocality, #55): a slug, or Celé Česko picked on purpose — then all of
   * Czechia even for a user with a home locality (#299). Without it the API picks: the profile's
   * home locality, else all of Czechia.
   */
  localitySlug?: string
  /**
   * „Tyhle skupiny rozšiřují partu“: the groups of GET /api/home, shown by the groups feature
   * (the route passes it in). `lokalita` is the locality its „Všechny skupiny“ opens.
   */
  renderGroups?: (groups: unknown[], lokalita: string) => ReactNode
  /** For the dates in the sections' lines; now by default. */
  now?: Date
  /**
   * The page's locality with its chip (#299): which locality the sections are for, a guess
   * marked „odhad“ and dismissable. Without it no chip (tests of the sections alone).
   */
  localityControl?: {
    state: LocalityState
    onChange: (slug: string) => void
    onReset: () => void
  }
}

/**
 * `localitySlug` for the page's locality (useLocality): Celé Česko only when the visitor picked
 * it, so the home locality doesn't come back in its place (#299). Celé Česko as a mere fallback —
 * the guess by IP failed, a visitor with nothing known — is no choice: the API decides, and a
 * signed-in user still gets the home locality (review #321).
 */
export const pageLocalitySlug = (state: LocalityState): string | undefined =>
  state.slug === ALL_LOCALITIES_SLUG && !state.isPicked ? undefined : state.slug

/**
 * Landing page (US-01, #182; Figma A-01 / A-01d for a visitor, A-01p / A-01pd signed in). The
 * band with the panel „Teď chybí jeden“, then the sections GET /api/home chose — a visitor
 * one under another with „Jak to funguje“ after „Tady chybíš“, a signed-in user the quick
 * picks „Pro tebe“ as tabs — the groups that grow and „Nic pro tebe?“. A section with nothing
 * in it isn't there (the API leaves it out).
 */
export function LandingView({
  isSignedIn,
  viewerId,
  localitySlug,
  renderGroups,
  now = new Date(),
  localityControl,
}: LandingViewProps) {
  const localitiesQuery = useQuery(localitiesQueryOptions())
  const localities = localitiesQuery.data
  const localityId =
    isSignedIn === undefined
      ? undefined
      : localitySlug === undefined
        ? null
        : localitySlug === ALL_LOCALITIES_SLUG
          ? HOME_WHOLE_COUNTRY
          : localities
            ? (localities.find((l) => l.slug === localitySlug)?.id ?? null)
            : // wait for the slug's id rather than load the sections for elsewhere first
              localitiesQuery.isError
              ? null
              : undefined
  const homeQuery = useQuery(homeQueryOptions(localityId, viewerId))
  const home = homeQuery.data
  const isVisitor = isSignedIn === false

  return (
    <main className="flex flex-1 flex-col">
      <PageBand
        variant="hero"
        title={
          isSignedIn === undefined ? (
            <span className="invisible">{VISITOR_TITLE}</span>
          ) : isSignedIn ? (
            SIGNED_IN_TITLE
          ) : (
            VISITOR_TITLE
          )
        }
        description={
          isSignedIn
            ? "Akce z okolí a podle tvých zájmů, kterým chybí lidi. Přidej se, nebo založ vlastní."
            : "Volejbal, deskovky, běh… Najdi akci ve svém okolí, nebo založ vlastní a lidi se přidají."
        }
        aside={
          // loaded data stays when a refetch (window focus, invalidation) fails
          home ? (
            <Panel
              home={home}
              isSignedIn={Boolean(isSignedIn)}
              localities={localities}
              now={now}
            />
          ) : homeQuery.isError ? (
            <MissingOnePanelError onRetry={() => void homeQuery.refetch()} />
          ) : (
            <MissingOnePanelSkeleton />
          )
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="h-11 px-5 text-base font-semibold"
          >
            <Link to={ROUTES.events}>Prohlédnout akce</Link>
          </Button>
          {isSignedIn === undefined ? null : (
            <Button
              asChild
              variant="outline"
              className="h-11 border-on-hero px-5 text-base font-semibold"
            >
              {isVisitor ? (
                <Link to={ROUTES.signup}>Zaregistrovat se</Link>
              ) : (
                <Link to={ROUTES.myEvents}>Moje akce</Link>
              )}
            </Button>
          )}
        </div>
      </PageBand>
      {/* Figma A-01: 32 px around and between the sections on a phone; A-01d: 72 px under the
          band and at the bottom, 96 px between the sections, 128 before „Nic pro tebe?“ */}
      <div className={cn(PAGE, "flex-1 pt-8 pb-8 md:pt-18 md:pb-18")}>
        {home && localities && localityControl ? (
          // which locality the sections are for (#299), close above the first of them
          <div className="pb-4 md:pb-6">
            <LandingLocality
              state={localityControl.state}
              home={home}
              localities={localities}
              isUpdating={homeQuery.isPlaceholderData}
              onChange={localityControl.onChange}
              onReset={localityControl.onReset}
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col gap-8 md:gap-24">
          {home ? (
            <Sections
              home={home}
              isVisitor={isVisitor}
              localities={localities}
              now={now}
              renderGroups={renderGroups}
            />
          ) : homeQuery.isError ? (
            isVisitor ? (
              <HowItWorks />
            ) : null
          ) : (
            <SectionSkeleton />
          )}
          <NothingForYou />
        </div>
      </div>
    </main>
  )
}

type SectionsContext = {
  home: Home
  localities: Locality[] | undefined
  now: Date
}

function Panel({ home, isSignedIn, localities, now }: SectionsContext & { isSignedIn: boolean }) {
  const highlight = eventSection(home, "highlight")?.events[0]
  if (highlight) {
    return (
      <MissingOnePanel
        event={highlight}
        now={now}
      />
    )
  }
  return (
    <EmptyMissingOnePanel
      hasOtherEvents={home.sections.some((section) => "events" in section)}
      // the locality has nothing to join (isWidened): there may be events, just none to join
      isNothingToJoin={home.isWidened}
      isSignedIn={isSignedIn}
      eventsSearch={listSearch(home, localities)}
    />
  )
}

function Sections({
  home,
  isVisitor,
  localities,
  now,
  renderGroups,
}: SectionsContext & Pick<LandingViewProps, "renderGroups"> & { isVisitor: boolean }) {
  const copy = sectionCopy({ home, localities, now })
  const groups = home.sections.find(
    (section): section is HomeGroupsSection => section.key === "groups",
  )
  const lokalita = listLocalitySlug(home, localities)

  const section = (key: Exclude<HomeEventSectionKey, "highlight">): ReactNode => {
    const events = eventSection(home, key)?.events
    if (!events?.length) return null
    const { heading, description, more } = copy[key]
    return (
      <HomeSection
        heading={heading}
        description={description}
        more={{ label: "Zobrazit všechny", link: more }}
      >
        <HomeEventGrid events={events} />
      </HomeSection>
    )
  }

  const picks: QuickPick[] = PICK_KEYS.flatMap((key) => {
    const events = eventSection(home, key)?.events
    if (!events?.length) return []
    const { label, pickDescription, more } = copy[key]
    return [{ key, label, description: pickDescription, events, more }]
  })

  return (
    <>
      {isVisitor ? (
        <>
          {section("missing")}
          <HowItWorks />
          {section("weekend")}
          {section("nearby")}
          {section("popular")}
          {section("wellRated")}
        </>
      ) : (
        <PickedForYou picks={picks} />
      )}
      {groups?.groups.length && renderGroups ? renderGroups(groups.groups, lokalita) : null}
    </>
  )
}

/** The signed-in quick picks in the order of Figma A-01pd. */
const PICK_KEYS = ["missing", "weekend", "interests", "nearby", "wellRated"] as const

const eventSection = (home: Home, key: HomeEventSectionKey) =>
  home.sections.find((section): section is HomeEventSection => section.key === key)

/** The catalog's record of the API's locality, for its city and whether it is a district. */
function pageLocality(home: Home, localities: Locality[] | undefined) {
  if (!home.locality) return null
  const record = localities?.find((l) => l.id === home.locality?.id)
  const city = record?.parentId ? localities?.find((l) => l.id === record.parentId) : undefined
  return {
    name: home.locality.name,
    slug: home.locality.slug,
    isDistrict: Boolean(record?.parentId),
    city,
  }
}

/**
 * `?lokalita=` for „Zobrazit všechny“: the sections of a district cover its whole city (B-027),
 * so /akce gets the city; without a locality all of Czechia (/akce alone would mean Praha).
 */
function listLocalitySlug(home: Home, localities: Locality[] | undefined): string {
  const locality = pageLocality(home, localities)
  if (!locality) return ALL_LOCALITIES_SLUG
  return locality.city?.slug ?? locality.slug
}

/**
 * /akce for „Zobrazit všechny“ and the panel's link: the page's locality (a district's city,
 * B-027). Widened (review #321): the locality itself with the okolí that holds the nearest events
 * shown, so the link opens the list the section promises, not the empty locality.
 */
function listSearch(
  home: Home,
  localities: Locality[] | undefined,
  key?: HomeEventSectionKey,
): { lokalita: string; okoli?: Radius } {
  if (home.isWidened && home.locality) {
    return { lokalita: home.locality.slug, okoli: widenedOkoli(home, key) }
  }
  return { lokalita: listLocalitySlug(home, localities) }
}

type SectionCopy = {
  heading: { before?: string; keyword: string; after?: string; hasLogo?: boolean }
  description: string
  /** The quick pick's tab. */
  label: string
  /** The quick pick's line, after „{label}: “. */
  pickDescription: string
  more: LinkProps
}

/** Headings, lines and links of the sections (Figma A-01d, A-01pd). */
function sectionCopy({
  home,
  localities,
  now,
}: SectionsContext): Record<Exclude<HomeEventSectionKey, "highlight">, SectionCopy> {
  const locality = pageLocality(home, localities)
  // the nearest events of an empty locality are not in it, they are around it (#299)
  const area =
    home.isWidened && locality ? `v okolí lokality ${locality.name}` : areaPhrase(locality)
  const list = listSearch(home, localities)
  const weekend = weekendDays(now)
  const events = (key: HomeEventSectionKey, search: Record<string, string> = {}): LinkProps => ({
    to: ROUTES.events,
    search: { ...listSearch(home, localities, key), ...search },
  })
  return {
    missing: {
      heading: { before: "Tady ", keyword: "chybíš", hasLogo: true },
      description: `Těmhle akcím ${area} ještě chybí lidi do minima.`,
      label: "Tady chybíš",
      pickDescription: `akce ${area}, kterým chybí lidi do minima. Akce, na které už jdeš, tu nejsou. Akce z panelu nahoře se tu neopakuje.`,
      // the section's events: missing people, in its locality and okolí (#321). Not the quick pick
      // „Tady chybíš“, which adds +10 km, one's interests and leaves out one's events (#305);
      // the filter no longer offers „chybi“, but the chip names it („Chybí lidé“)
      more: events("missing", { obsazenost: "chybi" }),
    },
    weekend: {
      heading: { before: "Tento ", keyword: "víkend" },
      description: `${weekendLabel(now)} ${area}`,
      label: "Tento víkend",
      pickDescription: `${weekendLabel(now)} ${area}.`,
      more: events("weekend", { od: isoDay(weekend.from), do: isoDay(weekend.to) }),
    },
    interests: {
      heading: { before: "Podle tvých ", keyword: "zájmů" },
      description: "Aktivity z tvého profilu a z akcí, na které chodíš",
      label: "Podle tvých zájmů",
      pickDescription: `aktivity z tvého profilu a z akcí, na které chodíš, ${area}.`,
      more: events("interests"),
    },
    nearby: {
      heading: { before: "Kousek ", keyword: "od tebe" },
      description: locality ? `Nejblíž ke středu lokality ${locality.name}` : "Nejbližší akce",
      label: "Kousek od tebe",
      pickDescription: locality
        ? `nejblíž ke středu lokality ${locality.name}.`
        : "nejbližší akce.",
      more: {
        to: ROUTES.events,
        // the nearest are measured from the locality itself, also from a district
        search: home.isWidened
          ? listSearch(home, localities, "nearby")
          : { lokalita: locality?.slug ?? list.lokalita },
      },
    },
    popular: {
      heading: { before: "O tyhle akce je ", keyword: "zájem" },
      description: "Nejvíc lidí jde nebo čeká na schválení",
      label: "O tyhle akce je zájem",
      pickDescription: "nejvíc lidí jde nebo čeká na schválení.",
      more: events("popular"),
    },
    wellRated: {
      heading: { before: "Od dobře ", keyword: "hodnocených", after: " organizátorů" },
      description: "Pořádají je lidi a skupiny s průměrem aspoň 4,5",
      label: "Od dobře hodnocených",
      pickDescription: `pořádají je lidi a skupiny s průměrem aspoň 4,5 ${area}.`,
      more: events("wellRated"),
    },
  }
}

/** While the sections load: one section's shape (DESIGN.md › Every list has three states). */
function SectionSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 md:gap-7"
      aria-busy
      aria-label="Načítám akce"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56 md:h-12 md:w-80" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        {Array.from({ length: 3 }, (_, i) => (
          <EventCardSkeleton
            key={i}
            variant="responsive"
          />
        ))}
      </div>
    </div>
  )
}
