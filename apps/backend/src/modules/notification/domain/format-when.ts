const PRAGUE = 'Europe/Prague';

const dayOf = new Intl.DateTimeFormat('cs-CZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: PRAGUE,
});
const timeOf = new Intl.DateTimeFormat('cs-CZ', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: PRAGUE,
});
// sortable, to tell whether two moments fall on the same day in Prague
const dayKey = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: PRAGUE,
});

/** „so 24. 10. 2026 v 18:00“, in Prague time whatever the server's zone is. */
export const formatWhen = (date: Date): string =>
  `${dayOf.format(date)} v ${timeOf.format(date)}`;

/** The start, and the end when there is one: only the time if it is the same day. */
export const formatRange = (startsAt: Date, endsAt: Date | null): string => {
  if (!endsAt) return formatWhen(startsAt);
  const sameDay = dayKey.format(startsAt) === dayKey.format(endsAt);
  return `${formatWhen(startsAt)} až ${sameDay ? timeOf.format(endsAt) : formatWhen(endsAt)}`;
};
