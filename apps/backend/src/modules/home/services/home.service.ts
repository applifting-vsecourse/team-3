import {
  PublicEvent,
  PublicEventFilters,
  PublicEventSort,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import {
  EventsService,
  PUBLIC_EVENTS_LIMIT,
  SCAN_LIMIT,
} from '@/modules/event/services/events.service';
import { GroupSummary } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import {
  HomeLocalitySource,
  resolveHomeLocalityId,
} from '@/modules/home/domain/home-locality';
import {
  buildHomeEventSections,
  HomeEventSectionKey,
  HomeViewer,
  orderRecruitingGroups,
} from '@/modules/home/domain/home-sections';
import { keepPicked, PickFilters } from '@/modules/home/domain/picked-events';
import { HomeRepository } from '@/modules/home/repositories/home.repository';
import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * How many groups with an upcoming event are loaded before ordering them by
 * their next event. The endpoint is public, so the query stays bounded.
 */
export const GROUP_SCAN_LIMIT = 500;

export type HomeSection =
  | { key: HomeEventSectionKey; events: PublicEvent[] }
  | { key: 'groups'; groups: GroupSummary[] };

export type HomeView = {
  /**
   * The page's locality; null = all of Czechia. For a district the sections
   * cover its whole city, „Kousek od tebe“ is measured from the district.
   */
  locality: {
    id: string;
    slug: string;
    name: string;
    source: HomeLocalitySource;
  } | null;
  /** In the order of the page, only those with something in them. */
  sections: HomeSection[];
};

@Injectable()
export class HomeService {
  constructor(
    private readonly homeRepository: HomeRepository,
    private readonly eventRepository: EventRepository,
    private readonly groupRepository: GroupRepository,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * A quick pick on /akce (#250): the ordinary list filters and order, then
   * the personal parts with the landing page's rules (`keepPicked`), then the
   * limit — so matching events never fall behind it. `viewerId` is always
   * the session's user.
   */
  async getPickedEvents(
    filters: PublicEventFilters,
    options: { sort?: PublicEventSort; limit?: number },
    picks: PickFilters,
    viewerId: string | null,
    now: Date = new Date(),
  ): Promise<PublicEvent[]> {
    const isPersonal = Boolean(picks.interests || picks.notJoined);
    const [events, viewerData] = await Promise.all([
      this.eventsService.getPublicEvents(
        filters,
        { sort: options.sort, limit: SCAN_LIMIT },
        now,
      ),
      viewerId && isPersonal
        ? this.homeRepository.findViewer(viewerId, now)
        : null,
    ]);
    const viewer: HomeViewer | null = viewerId
      ? {
          id: viewerId,
          interestActivityIds: viewerData?.interestActivityIds ?? [],
          joinedEventIds: viewerData?.joinedEventIds ?? [],
        }
      : null;
    const ratings = picks.wellRated
      ? await this.homeRepository.findRatingSummaries(ratingOwnersOf(events))
      : new Map();
    return keepPicked(events, picks, viewer, ratings).slice(
      0,
      options.limit ?? PUBLIC_EVENTS_LIMIT,
    );
  }

  /**
   * The sections of the landing page (#182, B-027). `viewerId` is always the
   * session's user, never something from the request.
   */
  async getHome(
    query: { localityId?: string },
    viewerId: string | null,
    now: Date = new Date(),
    random: () => number = Math.random,
  ): Promise<HomeView> {
    const viewerData = viewerId
      ? await this.homeRepository.findViewer(viewerId, now)
      : null;
    const viewer: HomeViewer | null = viewerId
      ? {
          id: viewerId,
          interestActivityIds: viewerData?.interestActivityIds ?? [],
          joinedEventIds: viewerData?.joinedEventIds ?? [],
        }
      : null;

    const resolved = resolveHomeLocalityId({
      queryLocalityId: query.localityId,
      profileLocalityId: viewerData?.homeLocalityId,
    });
    const locality = resolved
      ? await this.homeRepository.findLocality(resolved.id)
      : null;
    if (resolved && !locality) {
      // shown as it is, so in Czech (like creating an event)
      throw new BadRequestException(['Neznámá lokalita.']);
    }

    // „v okolí Prahy 3“ (Figma A-01pd): a district alone is too small for the
    // page (a few events, often no group), so the sections cover its whole
    // city; „Kousek od tebe“ still measures from the district itself.
    const areaId = locality ? (locality.parentId ?? locality.id) : undefined;
    const filters = { localityId: areaId };
    const [events, interest, groups] = await Promise.all([
      this.eventRepository.findPublicEvents({
        filters,
        now,
        limit: SCAN_LIMIT,
      }),
      // „O tyhle akce je zájem“ is for visitors only
      viewer
        ? new Map<string, number>()
        : this.eventRepository.countInterest(filters, now),
      this.groupRepository.findRecruitingGroups({
        localityId: areaId,
        viewerId,
        now,
        limit: GROUP_SCAN_LIMIT,
      }),
    ]);
    const ratings = await this.homeRepository.findRatingSummaries(
      ratingOwnersOf(events),
    );

    const sections: HomeSection[] = buildHomeEventSections({
      events,
      interest,
      ratings,
      center: locality,
      viewer,
      now,
      random,
    });
    const recruiting = orderRecruitingGroups(groups);
    if (recruiting.length > 0) {
      sections.push({ key: 'groups', groups: recruiting });
    }

    return {
      locality:
        locality && resolved
          ? {
              id: locality.id,
              slug: locality.slug,
              name: locality.name,
              source: resolved.source,
            }
          : null,
      sections,
    };
  }
}

/** Organizers of personal events and groups of group events, each once. */
const ratingOwnersOf = (
  events: PublicEvent[],
): { userIds: string[]; groupIds: string[] } => ({
  userIds: [
    ...new Set(
      events.filter((event) => !event.group).map((event) => event.organizer.id),
    ),
  ],
  groupIds: [
    ...new Set(
      events.flatMap((event) => (event.group ? [event.group.id] : [])),
    ),
  ],
});
