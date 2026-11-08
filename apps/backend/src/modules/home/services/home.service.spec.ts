import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { SCAN_LIMIT } from '@/modules/event/services/events.service';
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
  ...extra,
});

describe('HomeService', () => {
  let homeRepository: MockProxy<HomeRepository>;
  let eventRepository: MockProxy<EventRepository>;
  let groupRepository: MockProxy<GroupRepository>;
  let service: HomeService;

  beforeEach(() => {
    homeRepository = mock<HomeRepository>();
    eventRepository = mock<EventRepository>();
    groupRepository = mock<GroupRepository>();
    eventRepository.findPublicEvents.mockResolvedValue([]);
    eventRepository.countInterest.mockResolvedValue(new Map());
    groupRepository.findRecruitingGroups.mockResolvedValue([]);
    homeRepository.findRatingSummaries.mockResolvedValue(new Map());
    service = new HomeService(homeRepository, eventRepository, groupRepository);
  });

  it('a visitor without a locality: all of Czechia, nothing personal asked for', async () => {
    const home = await service.getHome({}, null, now);

    expect(home).toEqual({ locality: null, sections: [] });
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
});
