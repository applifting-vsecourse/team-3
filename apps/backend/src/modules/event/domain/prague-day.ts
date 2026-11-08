const PRAGUE_TZ = 'Europe/Prague';
const MINUTE_IN_MS = 60 * 1000;

/** Date.UTC for any year: Date.UTC itself reads years 0–99 as 1900–1999. */
const utc = (
  year: number,
  monthIndex: number,
  date: number,
  hours = 0,
  minutes = 0,
): number => {
  const instant = new Date(0);
  instant.setUTCFullYear(year, monthIndex, date);
  instant.setUTCHours(hours, minutes);
  return instant.getTime();
};

/** Prague's offset from UTC in minutes at the given instant (handles summer time). */
const pragueOffsetMinutes = (instant: number): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRAGUE_TZ,
    // hour12 instead of hourCycle: the backend compiles with lib ES2017, which lacks hourCycle
    hour12: false,
    era: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: string): string | undefined =>
    parts.find((p) => p.type === type)?.value;
  const get = (type: string): number => Number(part(type));
  // year 0 is "1 BC" in the Gregorian calendar
  const year = part('era') === 'BC' ? 1 - get('year') : get('year');
  // some environments format midnight as "24" with hour12: false
  const asUtc = utc(
    year,
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
  );
  return Math.round((asUtc - instant) / MINUTE_IN_MS);
};

/**
 * Midnight at the start of a Prague calendar day ("2026-10-25") as a UTC instant.
 * Prague switches clocks at 2–3 a.m., so midnight always exists and is unambiguous.
 */
export const startOfPragueDay = (day: string): Date => pragueMidnight(day, 0);

/** Start of the Prague day after `day` — the exclusive upper bound of an inclusive range. */
export const startOfNextPragueDay = (day: string): Date =>
  pragueMidnight(day, 1);

/**
 * Prague midnight `daysLater` days after `day`. Works on numbers, not on a
 * "YYYY-MM-DD" string: the day after 9999-12-31 is in year 10000, which
 * toISOString writes as "+010000-01-01".
 */
const pragueMidnight = (day: string, daysLater: number): Date => {
  const [year, month, date] = day.split('-').map(Number);
  const midnightUtc = utc(year, month - 1, date + daysLater);
  const firstGuess =
    midnightUtc - pragueOffsetMinutes(midnightUtc) * MINUTE_IN_MS;
  return new Date(midnightUtc - pragueOffsetMinutes(firstGuess) * MINUTE_IN_MS);
};

// sortable "YYYY-MM-DD" of an instant in Prague
const pragueDayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: PRAGUE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The Prague calendar day ("2026-11-08") an instant falls on, whatever the server's zone. */
export const pragueDayOf = (instant: Date): string =>
  pragueDayKey.format(instant);

/** Midnight that started the Prague day `instant` falls on, e.g. for a daily limit (#194). */
export const startOfPragueDayOf = (instant: Date): Date =>
  startOfPragueDay(pragueDayOf(instant));
