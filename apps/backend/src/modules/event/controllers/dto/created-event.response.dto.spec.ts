import { computeCapacity } from '@/modules/event/domain/capacity';
import { EventDetailView } from '@/modules/event/domain/event';
import { CreatedEventResponseDto } from './created-event.response.dto';

const created: EventDetailView = {
  id: 'cm-e1',
  title: 'Deskovky po práci',
  startsAt: new Date('2026-11-02T17:00:00.000Z'),
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
  capacity: computeCapacity({ minParticipants: 3, maxParticipants: 6 }, 0),
  isPromoted: false,
  description: null,
  approvalMode: 'open',
  visibility: 'public',
  status: 'published',
  cancelReason: null,
  participants: [],
  myParticipation: null,
};

describe('CreatedEventResponseDto', () => {
  it('shareUrl is the absolute URL of the detail on the frontend', () => {
    expect(
      CreatedEventResponseDto.fromCreated(created, 'https://hobbyhub.example')
        .shareUrl,
    ).toBe('https://hobbyhub.example/akce/cm-e1');
    // a trailing slash in FRONTEND_URL doesn't double it
    expect(
      CreatedEventResponseDto.fromCreated(created, 'https://hobbyhub.example/')
        .shareUrl,
    ).toBe('https://hobbyhub.example/akce/cm-e1');
  });

  it('a new event shows „Chybí ještě 3“: nobody has joined yet', () => {
    const dto = CreatedEventResponseDto.fromCreated(created, 'https://x.cz');
    expect(dto).toMatchObject({
      approvedCount: 0,
      missingToMin: 3,
      isFull: false,
    });
  });
});
