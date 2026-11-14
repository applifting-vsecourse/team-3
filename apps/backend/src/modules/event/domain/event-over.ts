import type { Prisma } from '@/generated/prisma/client';
import {
  pragueDayOf,
  startOfNextPragueDay,
  startOfPragueDayOf,
} from './prague-day';

/**
 * When an event is over (#272) – one rule for its detail, the group's page,
 * the profiles, rating and /akce › Proběhlé: at its end, or without one at
 * the end of the Prague day it starts on. An 18:00 event with no end is still
 * going at 18:05, so it isn't „Proběhlá“ while people are there (review #269).
 * The frontend's `isEventOver` (formatEvent.ts) says the same.
 */
export function eventOverAt(event: {
  startsAt: Date;
  endsAt: Date | null;
}): Date {
  return event.endsAt ?? startOfNextPragueDay(pragueDayOf(event.startsAt));
}

/** Whether the event is over at `now` (`eventOverAt`); its last moment counts as over. */
export function isEventOver(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date,
): boolean {
  return eventOverAt(event) <= now;
}

/**
 * `isEventOver` as a Prisma `where`: an event without an end is over once its
 * Prague day has ended, i.e. it started before today's Prague midnight.
 */
export function eventOverWhere(now: Date): Prisma.EventWhereInput {
  return {
    OR: [
      { endsAt: { lte: now } },
      { endsAt: null, startsAt: { lt: startOfPragueDayOf(now) } },
    ],
  };
}

/** The opposite of `eventOverWhere`: upcoming events and those going on now. */
export function eventNotOverWhere(now: Date): Prisma.EventWhereInput {
  return {
    OR: [
      { endsAt: { gt: now } },
      { endsAt: null, startsAt: { gte: startOfPragueDayOf(now) } },
    ],
  };
}
