import { computeCapacity } from '@/modules/event/domain/capacity';
import { EventDetailView } from '@/modules/event/domain/event';
import { EventDetailResponseDto } from './event-detail.response.dto';

const aView = (overrides: Partial<EventDetailView> = {}): EventDetailView => ({
  id: 'e1',
  title: 'Deskovky po práci',
  startsAt: new Date('2026-10-24T16:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  lat: 50.0928,
  lng: 14.4508,
  activity: {
    id: 'a1',
    slug: 'deskove-hry',
    name: 'Deskové hry',
    category: { id: 'c1', slug: 'hry', name: 'Hry', icon: 'dice' },
  },
  locality: { id: 'l1', slug: 'praha-8', name: 'Praha 8' },
  organizer: { id: 'u1', name: 'Petra' },
  group: null,
  minParticipants: 3,
  maxParticipants: 6,
  capacity: computeCapacity({ minParticipants: 3, maxParticipants: 6 }, 2),
  isPromoted: false,
  description: null,
  approvalMode: 'approval',
  visibility: 'private',
  status: 'published',
  cancelReason: null,
  participants: null,
  ...overrides,
});

describe('EventDetailResponseDto.fromDomain', () => {
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

  it('does not send the visibility', () => {
    expect(EventDetailResponseDto.fromDomain(aView())).not.toHaveProperty(
      'visibility',
    );
  });

  it('refuses hidden and deleted events, which must have been 404', () => {
    expect(() =>
      EventDetailResponseDto.fromDomain(aView({ status: 'hidden' })),
    ).toThrow();
    expect(() =>
      EventDetailResponseDto.fromDomain(aView({ status: 'deleted' })),
    ).toThrow();
  });
});
