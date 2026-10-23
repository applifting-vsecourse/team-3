const PRAGUE_TZ = 'Europe/Prague';
const MINUTE_IN_MS = 60 * 1000;

/** Prague's offset from UTC in minutes at the given instant (handles summer time). */
const pragueOffsetMinutes = (instant: number): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRAGUE_TZ,
    // hour12 instead of hourCycle: the backend compiles with lib ES2017, which lacks hourCycle
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);
  // some environments format midnight as "24" with hour12: false
  const asUtc = Date.UTC(
    get('year'),
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
export const startOfPragueDay = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  const midnightUtc = Date.UTC(year, month - 1, date);
  const firstGuess =
    midnightUtc - pragueOffsetMinutes(midnightUtc) * MINUTE_IN_MS;
  return new Date(midnightUtc - pragueOffsetMinutes(firstGuess) * MINUTE_IN_MS);
};

/** Start of the Prague day after `day` — the exclusive upper bound of an inclusive range. */
export const startOfNextPragueDay = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + 1))
    .toISOString()
    .slice(0, 10);
  return startOfPragueDay(next);
};
