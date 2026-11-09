/**
 * Text as the event search compares it (#57): lower case, without diacritics,
 * a dash or a run of spaces as one space — „Frýdek-Místek“ is „frydek mistek“.
 * The same folding as the frontend's catalog search (`foldText`).
 */
export const foldText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs')
    .replace(/[\s\p{Dash}]+/gu, ' ')
    .trim();

/** What an event is found by: its title, its activity's name and keywords. */
export type SearchableEvent = {
  title: string;
  activity: { name: string; keywords: string[] };
};

/**
 * Whether the event matches the search (#57, B-029): every word of the query
 * is somewhere in the title, the activity's name or one of its keywords, so
 * „volejbal letna“ finds „Volejbal na Letné“ and „hokejka“ finds a florbal.
 * An empty query matches everything.
 */
export function matchesSearch(event: SearchableEvent, query: string): boolean {
  const words = foldText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    event.title,
    event.activity.name,
    ...event.activity.keywords,
  ]
    .map(foldText)
    .join(' | ');
  return words.every((word) => haystack.includes(word));
}
