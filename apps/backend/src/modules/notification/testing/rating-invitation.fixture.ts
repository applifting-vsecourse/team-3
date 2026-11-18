import {
  InvitationEvent,
  InvitationRecipient,
} from '@/modules/notification/domain/rating-invitation';

const user = (id: string): InvitationRecipient => ({
  id,
  email: `${id}@example.test`,
  blockedAt: null,
  deletedAt: null,
});

export const invitationEvent = (): InvitationEvent => ({
  id: 'event-1',
  title: 'Večer u deskovek',
  status: 'published',
  startsAt: new Date('2026-11-17T16:00:00Z'),
  endsAt: new Date('2026-11-17T18:00:00Z'),
  minParticipants: 2,
  organizerUserId: 'organizer',
  organizer: user('organizer'),
  participations: [
    { user: user('alice'), rating: null },
    { user: user('bob'), rating: null },
  ],
  ratings: [],
});
