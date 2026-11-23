import { ThrottlerModuleOptions } from '@nestjs/throttler';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * The API's own rate limits (#230, N-5 and N-10 of the security audit). Each
 * guard in rate-limit.guards.ts picks the ones it applies. Set so a demo or a
 * walk through the happy path never meets them: they stop bulk creation and
 * bulk downloading, not people using the app. The counts live in memory and
 * reset when the backend restarts. Messages are shown as they are (the
 * frontend shows the API's message of a 4xx). Guards run before validation,
 * so a refused form (400) counts too.
 */
export const RATE_LIMITS = {
  // places added to the public catalog, per user
  locality: {
    limit: 20,
    ttl: HOUR_MS,
    message: 'Nových míst je teď moc. Zkus to znovu za chvíli.',
  },
  // new events and groups together, per user
  create: {
    limit: 20,
    ttl: HOUR_MS,
    message: 'Nových akcí a skupin je teď moc. Zkus to znovu později.',
  },
  // every other write (sign-ups, messages, edits, approvals…), per user
  write: {
    limit: 120,
    ttl: MINUTE_MS,
    message: 'Posíláš toho teď moc najednou. Zkus to znovu za chvíli.',
  },
  // „Smazat účet“ (#64): each try checks a password, so few, per user —
  // guessing a password through it is no faster than through sign-in
  accountDeletion: {
    limit: 5,
    ttl: 15 * MINUTE_MS,
    message: 'Příliš mnoho pokusů. Zkus to znovu za 15 minut.',
  },
  // „Stáhnout moje data“ (#64): a dozen queries each, per user
  accountExport: {
    limit: 10,
    ttl: HOUR_MS,
    message: 'Svoje data stahuješ moc často. Zkus to znovu za hodinu.',
  },
  // public reads that carry names, per account when signed in, otherwise per
  // IP: a whole classroom on one Wi-Fi is one IP (#141), hence the generous limit
  publicRead: {
    limit: 600,
    ttl: MINUTE_MS,
    message: 'Načítáš toho teď moc najednou. Zkus to znovu za chvíli.',
  },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_OPTIONS: ThrottlerModuleOptions = {
  throttlers: Object.entries(RATE_LIMITS).map(([name, { limit, ttl }]) => ({
    name,
    limit,
    ttl,
    // One count per limit and caller across all the routes that share it. The
    // library would count each route apart, so 20 events and 20 groups.
    generateKey: (_context, tracker, throttlerName): string =>
      `${throttlerName}:${tracker}`,
  })),
};
