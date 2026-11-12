import {
  decideParticipantRating,
  hasEventEnded,
} from '@/modules/rating/domain/participant-rating';
import {
  organizerRatingSummary,
  participantRatingSummary,
  RatingSummary,
} from '@/modules/rating/domain/rating-summary';
import { demoUsers } from './demo-data';
import { pastEvents, toPastEventRow } from './rating-data';

// Kontroly proběhlých akcí a hodnocení (#180): jdou vložit do databáze
// (odkazy, unikátnost, hvězdičky 1–5) a odpovídají pravidlům hodnocení.

const now = new Date('2026-11-01T15:00:00.000Z');
const rows = pastEvents.map((event) => toPastEventRow(event, now));
const users = new Map(demoUsers.map((user) => [user.key, user]));
// the seed writes the ratings long after the event; the rules are checked
// for when they would have been given: the day after, within the window (#66)
const DAY_MS = 24 * 60 * 60 * 1000;
const dayAfter = (row: { endsAt: Date }): Date =>
  new Date(row.endsAt.getTime() + DAY_MS);
const unique = (values: string[]): boolean =>
  new Set(values).size === values.length;

describe('past events and ratings (#180)', () => {
  it('have unique keys and refer only to verified demo users', () => {
    expect(unique(pastEvents.map((event) => event.key))).toBe(true);
    for (const event of pastEvents) {
      for (const key of [event.organizerKey, ...event.participantKeys]) {
        expect(users.get(key)?.emailVerified).toBe(true);
      }
    }
  });

  it('are over at least an hour before the seed, also around a change of time', () => {
    for (const at of [
      now,
      new Date('2026-03-29T01:30:00.000Z'), // spring forward in Prague
      new Date('2026-10-25T01:30:00.000Z'), // fall back
      new Date('2026-11-01T23:30:00.000Z'), // just after midnight in Prague
    ]) {
      for (const event of pastEvents) {
        const row = toPastEventRow(event, at);
        expect(row.endsAt.getTime()).toBeLessThanOrEqual(
          at.getTime() - 60 * 60 * 1000,
        );
        expect(hasEventEnded(row, at)).toBe(true);
      }
    }
  });

  it('took place: enough approved participants for the minimum, not more than the maximum', () => {
    for (const event of pastEvents) {
      expect(event.participantKeys.length).toBeGreaterThanOrEqual(
        event.minParticipants,
      );
      expect(event.participantKeys.length).toBeLessThanOrEqual(
        event.maxParticipants,
      );
    }
  });

  it('approves the participants before the event', () => {
    for (const row of rows) {
      for (const participation of row.participations) {
        expect(participation.approvedAt.getTime()).toBeLessThan(
          row.startsAt.getTime(),
        );
      }
    }
  });

  it('Rating: only by an approved participant, not the organizer, once per event, 1–5 stars', () => {
    for (const event of pastEvents) {
      expect(unique(event.ratings.map((r) => r.userKey))).toBe(true);
      for (const rating of event.ratings) {
        expect(event.participantKeys).toContain(rating.userKey);
        expect(rating.userKey).not.toBe(event.organizerKey);
        for (const stars of [rating.eventStars, rating.organizerStars]) {
          expect(Number.isInteger(stars)).toBe(true);
          expect(stars).toBeGreaterThanOrEqual(1);
          expect(stars).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('ParticipantRating: the organizer rates approved participants once, 1–5 stars (decideParticipantRating)', () => {
    for (const row of rows) {
      expect(unique(row.participantRatings.map((r) => r.userKey))).toBe(true);
      for (const rating of row.participantRatings) {
        expect(
          decideParticipantRating(
            {
              eventStatus: 'published',
              startsAt: row.startsAt,
              endsAt: row.endsAt,
              organizerUserId: row.organizerKey,
              raterId: row.organizerKey,
              participantId: rating.userKey,
              participationStatus: row.participations.some(
                (p) => p.userKey === rating.userKey,
              )
                ? 'approved'
                : 'pending',
            },
            dayAfter(row),
          ),
        ).toEqual({ ok: true });
        expect(Number.isInteger(rating.stars)).toBe(true);
        expect(rating.stars).toBeGreaterThanOrEqual(1);
        expect(rating.stars).toBeLessThanOrEqual(5);
      }
    }
  });

  it('give the profiles the averages the header promises', () => {
    const asOrganizer = (key: string): RatingSummary =>
      organizerRatingSummary(
        pastEvents
          .filter((event) => event.organizerKey === key)
          .flatMap((event) =>
            event.ratings.map((rating) => ({
              organizerStars: rating.organizerStars,
              deletedAt: rating.deleted ? now : null,
              event: { groupId: null },
            })),
          ),
      );
    const asParticipant = (key: string): RatingSummary =>
      participantRatingSummary(
        pastEvents.flatMap((event) =>
          event.participantRatings
            .filter((rating) => rating.userKey === key)
            .map((rating) => ({
              stars: rating.stars,
              deletedAt: rating.deleted ? now : null,
            })),
        ),
      );

    expect(asOrganizer('organizator')).toEqual({ average: 4.5, count: 6 });
    expect(asParticipant('uzivatel')).toEqual({ average: 4.3, count: 4 });
    expect(asOrganizer('uzivatel')).toEqual({ average: null, count: 0 });
    expect(asParticipant('organizator')).toEqual({ average: 5, count: 1 });
  });
});
