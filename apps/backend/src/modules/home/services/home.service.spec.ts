import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import {
  EventsService,
  SCAN_LIMIT,
} from '@/modules/event/services/events.service';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { HomeRepository } from '@/modules/home/repositories/home.repository';
import { BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { GROUP_SCAN_LIMIT, HomeService } from './home.service';

const now = new Date('2026-11-04T10:00:00.000Z');
const PRAHA_3 = {
  id: 'l-praha-3',
  slug: 'praha-3',
  name: 'Praha 3',
  lat: 50.0833,
  lng: 14.45,
  parentId: 'l-praha',
};
const PRAHA = {
  id: 'l-praha',
  slug: 'praha',
  name: 'Praha',
  lat: 50.0755,
  lng: 14.4378,
  parentId: null,
};

const anEvent = (
  id: string,
  approved: number,
  extra: Partial<PublicEvent> = {},
): PublicEvent => ({
  id,
  title: `Akce ${id}`,
  summary: null,
  startsAt: new Date('2026-11-05T16:00:00.000Z'),
  endsAt: null,
  address: 'Praha',
  lat: PRAHA_3.lat,
  lng: PRAHA_3.lng,
  activity: {
    id: 'a-volejbal',
    slug: 'volejbal',
    name: 'Volejbal',
    keywords: [],
    category: { id: 'c-sport', slug: 'sport', name: 'Sport', icon: 'ball' },
  },
  locality: { id: PRAHA_3.id, slug: PRAHA_3.slug, name: PRAHA_3.name },
  organizer: { id: 'u-org', name: 'Petra' },
  group: null,
  minParticipants: 4,
  maxParticipants: 10,
  capacity: computeCapacity(
    { minParticipants: 4, maxParticipants: 10 },
    approved,
  ),
  isPromoted: false,
  distanceKm: null,
  ...extra,
});

describe('HomeService', () => {
  let homeRepository: MockProxy<HomeRepository>;
  let eventRepository: MockProxy<EventRepository>;
  let groupRepository: MockProxy<GroupRepository>;
  let eventsService: MockProxy<EventsService>;
  let service: HomeService;

  beforeEach(() => {
    homeRepository = mock<HomeRepository>();
    eventRepository = mock<EventRepository>();
    groupRepository = mock<GroupRepository>();
    eventRepository.findPublicEvents.mockResolvedValue([]);
    eventRepository.countInterest.mockResolvedValue(new Map());
    groupRepository.findRecruitingGroups.mockResolvedValue([]);
    homeRepository.findRatingSummaries.mockResolvedValue(new Map());
    eventsService = mock<EventsService>();
    service = new HomeService(
      homeRepository,
      eventRepository,
      groupRepository,
      eventsService,
    );
  });

  it('a visitor without a locality: all of Czechia, nothing personal asked for', async () => {
    const home = await service.getHome({}, null, now);

    expect(home).toEqual({ locality: null, sections: [], isWidened: false });
    expect(homeRepository.findViewer).not.toHaveBeenCalled();
    expect(eventRepository.findPublicEvents).toHaveBeenCalledWith({
      filters: { localityId: undefined },
      now,
      limit: SCAN_LIMIT,
    });
    expect(groupRepository.findRecruitingGroups).toHaveBeenCalledWith({
      localityId: undefined,
      viewerId: null,
      now,
      limit: GROUP_SCAN_LIMIT,
    });
  });

  describe('a locality with no events (#299)', () => {
    // Trutnov, about 23 km from Police nad Metují; Praha far away
    const POLICE = {
      id: 'l-police',
      slug: 'police-nad-metuji',
      name: 'Police nad Metují',
      lat: 50.5369,
      lng: 16.2335,
      parentId: null,
    };
    // Trutnov misses one person, Praha three
    const trutnov = anEvent('trutnov', 3, { lat: 50.561, lng: 15.9127 });
    const praha = anEvent('praha', 1);

    beforeEach(() => {
      homeRepository.findLocality.mockResolvedValue(POLICE);
      eventRepository.findPublicEvents.mockImplementation(({ filters }) =>
        Promise.resolve(filters.localityId ? [] : [praha, trutnov]),
      );
    });

    it('the sections come from the nearest events anywhere, with their distance', async () => {
      const home = await service.getHome({ localityId: POLICE.id }, null, now);

      expect(home.isWidened).toBe(true);
      expect(home.locality?.slug).toBe('police-nad-metuji');
      expect(eventRepository.findPublicEvents).toHaveBeenLastCalledWith({
        filters: {},
        now,
        limit: SCAN_LIMIT,
      });
      expect(eventRepository.countInterest).toHaveBeenLastCalledWith({}, now);
      const events = home.sections.flatMap((section) =>
        'events' in section ? section.events : [],
      );
      expect(home.sections.map((section) => section.key)).toEqual([
        'highlight',
        'missing',
      ]);
      expect(events.map((event) => [event.id, event.distanceKm])).toEqual([
        ['trutnov', 22.8],
        ['praha', 136.3],
      ]);
    });

    it('nothing anywhere: still not widened, no sections', async () => {
      eventRepository.findPublicEvents.mockResolvedValue([]);

      const home = await service.getHome({ localityId: POLICE.id }, null, now);

      expect(home).toMatchObject({ isWidened: false, sections: [] });
    });

    it('a locality with events of its own is never widened', async () => {
      eventRepository.findPublicEvents.mockResolvedValue([trutnov]);

      const home = await service.getHome({ localityId: POLICE.id }, null, now);

      expect(home.isWidened).toBe(false);
      expect(eventRepository.findPublicEvents).toHaveBeenCalledTimes(1);
    });

    it('all of Czechia has nothing to widen to', async () => {
      eventRepository.findPublicEvents.mockResolvedValue([]);

      const home = await service.getHome({}, null, now);

      expect(home.isWidened).toBe(false);
      expect(eventRepository.findPublicEvents).toHaveBeenCalledTimes(1);
    });
  });

  it('a visitor with the locality of the page gets it back, with popular events', async () => {
    homeRepository.findLocality.mockResolvedValue(PRAHA_3);
    eventRepository.findPublicEvents.mockResolvedValue([anEvent('e1', 4)]);
    eventRepository.countInterest.mockResolvedValue(new Map([['e1', 3]]));

    const home = await service.getHome({ localityId: PRAHA_3.id }, null, now);

    expect(home.locality).toEqual({
      id: PRAHA_3.id,
      slug: PRAHA_3.slug,
      name: PRAHA_3.name,
      source: 'query',
    });
    // a district: the sections cover its whole city
    expect(eventRepository.countInterest).toHaveBeenCalledWith(
      { localityId: PRAHA.id },
      now,
    );
    // in the same spot, so „Kousek od tebe“ comes first and takes it
    expect(home.sections.map((section) => section.key)).toEqual(['nearby']);
  });

  it('signed in without a locality asked for: the home locality from the profile', async () => {
    homeRepository.findViewer.mockResolvedValue({
      homeLocalityId: PRAHA_3.id,
      interestActivityIds: ['a-volejbal'],
      joinedEventIds: ['joined'],
    });
    homeRepository.findLocality.mockResolvedValue(PRAHA_3);
    eventRepository.findPublicEvents.mockResolvedValue([
      anEvent('joined', 3),
      anEvent('e1', 4),
    ]);

    const home = await service.getHome({}, 'u-me', now);

    expect(homeRepository.findViewer).toHaveBeenCalledWith('u-me', now);
    expect(homeRepository.findLocality).toHaveBeenCalledWith(PRAHA_3.id);
    expect(home.locality?.source).toBe('profile');
    // no popular for a signed-in user, so interest isn't even counted
    expect(eventRepository.countInterest).not.toHaveBeenCalled();
    expect(home.sections).toEqual([
      { key: 'interests', events: [anEvent('e1', 4)] },
    ]);
    expect(groupRepository.findRecruitingGroups).toHaveBeenCalledWith(
      expect.objectContaining({ viewerId: 'u-me', localityId: PRAHA.id }),
    );
  });

  it('a district covers its whole city, „Kousek od tebe“ measures from the district', async () => {
    homeRepository.findLocality.mockResolvedValue(PRAHA_3);
    eventRepository.findPublicEvents.mockResolvedValue([
      // at the center of Prague, ~1 km from the center of Praha 3
      anEvent('center', 4, { lat: PRAHA.lat, lng: PRAHA.lng }),
      anEvent('in-praha-3', 4),
    ]);

    const home = await service.getHome({ localityId: PRAHA_3.id }, null, now);

    expect(eventRepository.findPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { localityId: PRAHA.id } }),
    );
    expect(groupRepository.findRecruitingGroups).toHaveBeenCalledWith(
      expect.objectContaining({ localityId: PRAHA.id }),
    );
    // the page still says Praha 3
    expect(home.locality?.id).toBe(PRAHA_3.id);
    expect(home.sections).toEqual([
      {
        key: 'nearby',
        events: [
          expect.objectContaining({ id: 'in-praha-3' }),
          expect.objectContaining({ id: 'center' }),
        ],
      },
    ]);
  });

  it('a city stays the city', async () => {
    homeRepository.findLocality.mockResolvedValue(PRAHA);

    await service.getHome({ localityId: PRAHA.id }, null, now);

    expect(eventRepository.findPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { localityId: PRAHA.id } }),
    );
  });

  it('all of Czechia picked on purpose: no home locality in its place (#299)', async () => {
    homeRepository.findViewer.mockResolvedValue({
      homeLocalityId: PRAHA_3.id,
      interestActivityIds: [],
      joinedEventIds: [],
    });

    const home = await service.getHome({ wholeCountry: true }, 'u-jakub', now);

    expect(home.locality).toBeNull();
    expect(homeRepository.findLocality).not.toHaveBeenCalled();
    expect(eventRepository.findPublicEvents).toHaveBeenCalledWith({
      filters: { localityId: undefined },
      now,
      limit: SCAN_LIMIT,
    });
  });

  it('the locality asked for wins over the profile', async () => {
    homeRepository.findViewer.mockResolvedValue({
      homeLocalityId: 'l-brno',
      interestActivityIds: [],
      joinedEventIds: [],
    });
    homeRepository.findLocality.mockResolvedValue(PRAHA_3);

    const home = await service.getHome({ localityId: PRAHA_3.id }, 'u-me', now);

    expect(homeRepository.findLocality).toHaveBeenCalledWith(PRAHA_3.id);
    expect(home.locality?.source).toBe('query');
  });

  it('an unknown locality is a 400', async () => {
    homeRepository.findLocality.mockResolvedValue(null);

    await expect(
      service.getHome({ localityId: 'nope' }, null, now),
    ).rejects.toThrow(BadRequestException);
    expect(eventRepository.findPublicEvents).not.toHaveBeenCalled();
  });

  it('asks for the ratings of personal organizers and of groups, each once', async () => {
    eventRepository.findPublicEvents.mockResolvedValue([
      anEvent('e1', 4, { organizer: { id: 'u1', name: 'A' } }),
      anEvent('e2', 4, { organizer: { id: 'u1', name: 'A' } }),
      anEvent('e3', 4, {
        organizer: { id: 'u2', name: 'B' },
        group: { id: 'g1', name: 'Parta' },
      }),
    ]);
    homeRepository.findRatingSummaries.mockResolvedValue(
      new Map([['group:g1', { average: 4.8, count: 5 }]]),
    );

    const home = await service.getHome({}, null, now);

    expect(homeRepository.findRatingSummaries).toHaveBeenCalledWith({
      userIds: ['u1'],
      groupIds: ['g1'],
    });
    expect(home.sections).toEqual([
      { key: 'wellRated', events: [expect.objectContaining({ id: 'e3' })] },
    ]);
  });

  it('groups come last, ordered, without the time of their next event', async () => {
    groupRepository.findRecruitingGroups.mockResolvedValue([
      {
        id: 'g1',
        name: 'Parta',
        type: 'public',
        activity: anEvent('x', 0).activity,
        locality: anEvent('x', 0).locality,
        memberCount: 3,
        nextEventAt: new Date('2026-11-05T10:00:00.000Z'),
      },
    ]);
    eventRepository.findPublicEvents.mockResolvedValue([anEvent('e1', 3)]);

    const home = await service.getHome({}, null, now);

    expect(home.sections.map((section) => section.key)).toEqual([
      'highlight',
      'groups',
    ]);
    expect(home.sections[1]).toEqual({
      key: 'groups',
      groups: [expect.not.objectContaining({ nextEventAt: expect.anything() })],
    });
  });

  describe('getPickedEvents (#250)', () => {
    it('asks the event list for the filters, then keeps what the pick wants, then cuts', async () => {
      eventsService.getPublicEvents.mockResolvedValue([
        anEvent('mine', 1, { organizer: { id: 'u-me', name: 'Já' } }),
        anEvent('joined', 1),
        anEvent('tenis', 1, {
          activity: { ...anEvent('x', 1).activity, id: 'a-tenis' },
        }),
        anEvent('volejbal', 1),
      ]);
      homeRepository.findViewer.mockResolvedValue({
        homeLocalityId: null,
        interestActivityIds: ['a-volejbal'],
        joinedEventIds: ['joined'],
      });

      const events = await service.getPickedEvents(
        { capacity: 'missing' },
        { sort: 'distance', limit: 5 },
        { interests: true, notJoined: true },
        'u-me',
        now,
      );

      expect(events.map((event) => event.id)).toEqual(['volejbal']);
      expect(eventsService.getPublicEvents).toHaveBeenCalledWith(
        { capacity: 'missing' },
        { sort: 'distance', limit: SCAN_LIMIT },
        now,
      );
      expect(homeRepository.findRatingSummaries).not.toHaveBeenCalled();
    });

    it('keeps only the well rated, by the summaries of their organizers and groups', async () => {
      eventsService.getPublicEvents.mockResolvedValue([
        anEvent('great', 1, { organizer: { id: 'u-great', name: 'A' } }),
        anEvent('new', 1, { organizer: { id: 'u-new', name: 'B' } }),
      ]);
      homeRepository.findRatingSummaries.mockResolvedValue(
        new Map([
          ['user:u-great', { average: 4.8, count: 5 }],
          ['user:u-new', { average: 5, count: 1 }],
        ]),
      );

      const events = await service.getPickedEvents(
        {},
        {},
        { wellRated: true },
        null,
        now,
      );

      expect(events.map((event) => event.id)).toEqual(['great']);
      expect(homeRepository.findViewer).not.toHaveBeenCalled();
    });
  });
});
