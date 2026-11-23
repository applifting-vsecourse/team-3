import { computeCapacity } from '@/modules/event/domain/capacity';
import { EventDetailView } from '@/modules/event/domain/event';
import { EventDetailResponseDto } from './event-detail.response.dto';

const aView = (overrides: Partial<EventDetailView> = {}): EventDetailView => ({
  id: 'e1',
  title: 'Deskovky po práci',
  summary: null,
  distanceKm: null,
  startsAt: new Date('2026-10-24T16:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  lat: 50.0928,
  lng: 14.4508,
  activity: {
    id: 'a1',
    slug: 'deskove-hry',
    name: 'Deskové hry',
    keywords: ['deskovky'],
    category: { id: 'c1', slug: 'hry', name: 'Hry', icon: 'dice' },
  },
  locality: { id: 'l1', slug: 'praha-8', name: 'Praha 8' },
  organizer: { id: 'u1', name: 'Petra' },
  group: null,
  minParticipants: 3,
  maxParticipants: 6,
  capacity: computeCapacity({ minParticipants: 3, maxParticipants: 6 }, 2),
  isPromoted: false,
  imageKey: null,
  description: null,
  approvalMode: 'approval',
  emailOnJoin: true,
  visibility: 'private',
  status: 'published',
  cancelReason: null,
  participants: null,
  myParticipation: null,
  viewerSignedIn: false,
  canManage: false,
  canEdit: false,
  canModerate: false,
  hiddenReason: null,
  ...overrides,
});

describe('EventDetailResponseDto.fromDomain', () => {
  it('passes on the e-mail for each sign-up as the service decided it (#86)', () => {
    expect(
      EventDetailResponseDto.fromDomain(aView({ emailOnJoin: null }))
        .emailOnJoin,
    ).toBeNull();
    expect(
      EventDetailResponseDto.fromDomain(aView({ emailOnJoin: true }))
        .emailOnJoin,
    ).toBe(true);
  });

  it('keeps a visitor at the count: participants stay null', () => {
    const dto = EventDetailResponseDto.fromDomain(aView());

    expect(dto.participants).toBeNull();
    expect(dto.approvedCount).toBe(2);
    expect(dto.missingToMin).toBe(1);
    expect(dto.approvalMode).toBe('approval');
  });

  it('passes the names on for a signed-in viewer', () => {
    const participants = [{ id: 'u2', name: 'Jana' }];

    expect(
      EventDetailResponseDto.fromDomain(aView({ participants })).participants,
    ).toEqual(participants);
  });

  it('says whether the API saw a signed-in viewer (#174)', () => {
    expect(EventDetailResponseDto.fromDomain(aView()).viewerSignedIn).toBe(
      false,
    );
    expect(
      EventDetailResponseDto.fromDomain(aView({ viewerSignedIn: true }))
        .viewerSignedIn,
    ).toBe(true);
  });

  it('says whether the viewer manages the event (B-055)', () => {
    expect(EventDetailResponseDto.fromDomain(aView()).canManage).toBe(false);
    expect(
      EventDetailResponseDto.fromDomain(aView({ canManage: true })).canManage,
    ).toBe(true);
  });

  it('sends the visibility: the detail of a group event says who sees it (A-05g)', () => {
    expect(
      EventDetailResponseDto.fromDomain(aView({ visibility: 'members' }))
        .visibility,
    ).toBe('members');
  });

  it('says what the superadmin may do (#308)', () => {
    const dto = EventDetailResponseDto.fromDomain(
      aView({ canEdit: true, canModerate: true }),
    );
    expect(dto.canEdit).toBe(true);
    expect(dto.canModerate).toBe(true);
  });

  it('passes a hidden event on: only the superadmin gets it (#308)', () => {
    expect(
      EventDetailResponseDto.fromDomain(aView({ status: 'hidden' })).status,
    ).toBe('hidden');
  });

  it('refuses a deleted event, which must have been 404', () => {
    expect(() =>
      EventDetailResponseDto.fromDomain(aView({ status: 'deleted' })),
    ).toThrow();
  });
});
