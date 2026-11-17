import { invitationEvent } from '@/modules/notification/testing/rating-invitation.fixture';
import {
  composeRatingInvitation,
  InvitationEvent,
  ratingBatchCutoff,
  ratingInvitations,
} from './rating-invitation';

const evening = new Date('2026-11-17T20:00:00Z');
const ids = (event: InvitationEvent, now = evening): string[] =>
  ratingInvitations(event, now).map(({ userId }) => userId);

describe('daily rating batch in Prague', () => {
  it.each([
    ['2026-11-17T19:59:59.999Z', '2026-11-16T20:00:00Z'],
    ['2026-11-17T20:00:00Z', '2026-11-17T20:00:00Z'],
    ['2026-03-29T18:59:59Z', '2026-03-28T20:00:00Z'],
    ['2026-03-29T19:00:00Z', '2026-03-29T19:00:00Z'],
    ['2026-10-25T19:59:59Z', '2026-10-24T19:00:00Z'],
    ['2026-10-25T20:00:00Z', '2026-10-25T20:00:00Z'],
  ])('cutoff at %s is %s (including both DST transitions)', (now, expected) => {
    expect(ratingBatchCutoff(new Date(now))).toEqual(new Date(expected));
  });

  it('waits for the evening even though the event has ended', () => {
    expect(ids(invitationEvent(), new Date('2026-11-17T19:59:59Z'))).toEqual(
      [],
    );
    expect(ids(invitationEvent())).toEqual(['alice', 'bob', 'organizer']);
  });

  it('includes events ending exactly at the cutoff, but not ongoing ones', () => {
    const event = invitationEvent();
    event.endsAt = evening;
    expect(ids(event)).toHaveLength(3);
    event.endsAt = new Date(evening.getTime() + 1);
    expect(ids(event)).toEqual([]);
  });

  it('catches up late events at the next evening, not the following morning', () => {
    const event = invitationEvent();
    event.endsAt = new Date('2026-11-17T22:00:00Z');
    expect(ids(event)).toEqual([]);
    expect(ids(event, new Date('2026-11-18T09:00:00Z'))).toEqual([]);
    expect(ids(event, new Date('2026-11-18T20:00:00Z'))).toHaveLength(3);
  });

  it('without endsAt waits for the end of the Prague start day', () => {
    const event = invitationEvent();
    event.endsAt = null;
    expect(ids(event)).toEqual([]);
    expect(ids(event, new Date('2026-11-18T20:00:00Z'))).toHaveLength(3);
  });

  it('recovers missed batches while the same 14-calendar-day rating window is open', () => {
    expect(
      ids(invitationEvent(), new Date('2026-12-01T22:59:59.999Z')),
    ).toHaveLength(3);
    expect(ids(invitationEvent(), new Date('2026-12-01T23:00:00Z'))).toEqual(
      [],
    );
  });

  it('midnight end belongs to the previous day for the rating deadline', () => {
    const event = invitationEvent();
    event.endsAt = new Date('2026-11-17T23:00:00Z');
    expect(ids(event, new Date('2026-12-01T22:59:59Z'))).toHaveLength(3);
    expect(ids(event, new Date('2026-12-01T23:00:00Z'))).toEqual([]);
  });
});

describe('rating invitation recipients', () => {
  it('invites approved participants without requiring attendance and the creator', () => {
    expect(ids(invitationEvent())).toEqual(['alice', 'bob', 'organizer']);
  });

  it.each(['cancelled', 'hidden', 'deleted'] as const)(
    'never invites anyone for a %s event',
    (status) => {
      expect(ids({ ...invitationEvent(), status })).toEqual([]);
    },
  );

  it('does not invite anyone when the event did not meet its minimum', () => {
    expect(ids({ ...invitationEvent(), minParticipants: 3 })).toEqual([]);
  });

  it('counts blocked/deleted participants toward the minimum, but does not email them', () => {
    const event = invitationEvent();
    event.participations[0].user.blockedAt = evening;
    event.participations[1].user.deletedAt = evening;
    expect(ids(event)).toEqual(['organizer']);
  });

  it('a blocked organizer does not suppress participant invitations', () => {
    const event = invitationEvent();
    event.organizer.blockedAt = evening;
    expect(ids(event)).toEqual(['alice', 'bob']);
  });

  it('an organizer joined to their own event receives only the organizer variant', () => {
    const event = invitationEvent();
    event.participations.push({ user: event.organizer, rating: null });
    const invitations = ratingInvitations(event, evening);
    expect(invitations.filter(({ userId }) => userId === 'organizer')).toEqual([
      {
        role: 'organizer',
        userId: 'organizer',
        email: 'organizer@example.test',
      },
    ]);
  });

  it('does not invite an organizer to rate only themselves', () => {
    const event = invitationEvent();
    event.minParticipants = 1;
    event.participations = [{ user: event.organizer, rating: null }];
    expect(ids(event)).toEqual([]);
  });

  it('does not invite a participant whose rating was removed by moderation', () => {
    const event = invitationEvent();
    event.ratings = [{ userId: 'alice' }];
    expect(ids(event)).toEqual(['bob', 'organizer']);
  });

  it('does not invite the organizer if every participant rating was removed', () => {
    const event = invitationEvent();
    event.participations.forEach((p) => {
      p.rating = { deletedAt: evening };
    });
    expect(ids(event)).toEqual(['alice', 'bob']);
  });
});

describe('E-01 rating invitation copy and links', () => {
  it.each([
    [
      'participant',
      'Jak se povedla akce Večer u deskovek?',
      'Ohodnotit akci',
      'hodnoceni',
    ],
    [
      'organizer',
      'Ohodnoť účastníky: Večer u deskovek',
      'Ohodnotit účastníky',
      'hodnoceni-ucastniku',
    ],
  ] as const)(
    'the %s variant leads directly to its existing rating screen',
    (role, subject, label, path) => {
      const message = composeRatingInvitation(
        invitationEvent(),
        role,
        'https://hobbyhub.test',
      );
      expect(message.subject).toBe(subject);
      expect(message.email.action).toEqual({
        label,
        url: `https://hobbyhub.test/akce/event-1/${path}`,
      });
      expect(message.email.paragraphs[0]).toContain('skončila');
      expect(message.email.details[1].value).toBe('1. 12. 2026');
    },
  );
});
