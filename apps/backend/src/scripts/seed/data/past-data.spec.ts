import {
  organizerRatingSummary,
  participantRatingSummary,
} from '@/modules/rating/domain/rating-summary';
import { communityUsers } from './community-data';
import { demoUsers } from './demo-data';
import { generatedPastEvents, PROFILE_SHOWCASE } from './past-data';
import { pastEvents, toPastEventRow } from './rating-data';
import { REGIONAL_CITIES } from './regional-data';

// Kontroly proběhlých akcí (#181, AK 3 a 4): je jich dost po celém Česku,
// hodnocení dávají smysl a ukázky profilu z rating-data.ts (#180) platí dál.

const allPast = [...pastEvents, ...generatedPastEvents];
const verified = new Set(
  [...demoUsers, ...communityUsers]
    .filter((u) => u.emailVerified)
    .map((u) => u.key),
);
const isPrague = (slug: string): boolean =>
  slug === 'praha' || slug.startsWith('praha-');

describe('generated past events (#181)', () => {
  it('are plenty, in every regional city, with some cancelled', () => {
    expect(generatedPastEvents.length).toBeGreaterThanOrEqual(80);
    for (const city of REGIONAL_CITIES) {
      const inCity = generatedPastEvents.filter((e) =>
        city === 'praha' ? isPrague(e.localitySlug) : e.localitySlug === city,
      );
      expect(`${city} ${inCity.length >= 4}`).toBe(`${city} true`);
    }
    const cancelled = generatedPastEvents.filter((e) => e.cancelReason);
    expect(cancelled.length).toBeGreaterThanOrEqual(2);
    expect(cancelled.length).toBeLessThan(generatedPastEvents.length / 5);
  });

  it('end before any seed and keep unique keys', () => {
    const now = new Date('2026-11-02T00:30:00+01:00');
    for (const event of generatedPastEvents) {
      expect(toPastEventRow(event, now).endsAt.getTime()).toBeLessThan(
        now.getTime(),
      );
    }
    const keys = allPast.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('let only verified users take part, never the organizer', () => {
    for (const event of generatedPastEvents) {
      expect(verified.has(event.organizerKey)).toBe(true);
      expect(event.participantKeys).not.toContain(event.organizerKey);
      expect(new Set(event.participantKeys).size).toBe(
        event.participantKeys.length,
      );
      event.participantKeys.forEach((key) =>
        expect(verified.has(key)).toBe(true),
      );
      expect(event.participantKeys.length).toBeLessThanOrEqual(
        event.maxParticipants,
      );
    }
  });

  // review PR #233: proběhlá akce pod minimem s hodnocením v historii profilu nedává smysl
  it('cancel every event that would not have reached its minimum', () => {
    for (const event of generatedPastEvents.filter((e) => !e.cancelReason)) {
      expect(
        `${event.key} ${event.participantKeys.length >= event.minParticipants}`,
      ).toBe(`${event.key} true`);
    }
  });

  it('rate only with participants, 1–5 stars, and never a cancelled event', () => {
    for (const event of generatedPastEvents) {
      const participants = new Set(event.participantKeys);
      if (event.cancelReason) {
        expect(event.ratings).toEqual([]);
        expect(event.participantRatings).toEqual([]);
      }
      for (const rating of event.ratings) {
        expect(participants.has(rating.userKey)).toBe(true);
        for (const stars of [rating.eventStars, rating.organizerStars]) {
          expect(stars).toBeGreaterThanOrEqual(1);
          expect(stars).toBeLessThanOrEqual(5);
        }
      }
      for (const rating of event.participantRatings) {
        expect(participants.has(rating.userKey)).toBe(true);
        expect(rating.stars).toBeGreaterThanOrEqual(1);
        expect(rating.stars).toBeLessThanOrEqual(5);
      }
    }
  });

  it('give most organizers good ratings and a few clearly worse ones (#182)', () => {
    const organizers = new Map<string, { organizerStars: number }[]>();
    for (const event of generatedPastEvents.filter((e) => !e.groupKey)) {
      organizers.set(event.organizerKey, [
        ...(organizers.get(event.organizerKey) ?? []),
        ...event.ratings,
      ]);
    }
    const averages = [...organizers.values()]
      .map(
        (ratings) =>
          organizerRatingSummary(
            ratings.map((r) => ({
              organizerStars: r.organizerStars,
              deletedAt: null,
              event: { groupId: null },
            })),
          ).average,
      )
      .filter((average): average is number => average !== null);
    expect(averages.filter((a) => a >= 4).length).toBeGreaterThan(
      averages.length / 2,
    );
    expect(averages.some((a) => a < 3.5)).toBe(true);
  });

  // Petra (organizator) a Jakub (uzivatel): průměry popsané v rating-data.ts
  it('leave the profile examples from rating-data.ts as they are', () => {
    for (const event of generatedPastEvents) {
      for (const rating of event.participantRatings) {
        expect(PROFILE_SHOWCASE.has(rating.userKey)).toBe(false);
      }
      if (PROFILE_SHOWCASE.has(event.organizerKey)) {
        expect(event.groupKey).toBeDefined();
      }
    }
    const jakub = allPast.flatMap((e) =>
      e.participantRatings
        .filter((r) => r.userKey === 'uzivatel')
        .map((r) => ({
          stars: r.stars,
          deletedAt: r.deleted ? new Date() : null,
        })),
    );
    expect(participantRatingSummary(jakub)).toEqual({ average: 4.3, count: 4 });
  });

  it('has nobody at two past events on the same day', () => {
    const days = new Map<string, number[]>();
    for (const event of allPast) {
      for (const key of [event.organizerKey, ...event.participantKeys]) {
        days.set(key, [...(days.get(key) ?? []), event.daysAgo]);
      }
    }
    for (const [key, list] of days) {
      expect(`${key} ${new Set(list).size === list.length}`).toBe(
        `${key} true`,
      );
    }
  });
});
