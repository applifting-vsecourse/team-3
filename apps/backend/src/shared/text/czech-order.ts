/**
 * Czech alphabetical order (#370): Š between S and T, Č between C and D, „Bě“
 * before „Br“, „Ch“ after H. The database's collation (en_US) can't do it, so
 * lists of names are sorted here; `Intl.Collator`, as the frontend's
 * `localeCompare(…, 'cs')`.
 */
const czech = new Intl.Collator('cs');

export const compareCzech = (a: string, b: string): number =>
  czech.compare(a, b);

/** A copy sorted by `name` in Czech order. */
export const byCzechName = <T extends { name: string }>(
  items: readonly T[],
): T[] => [...items].sort((a, b) => compareCzech(a.name, b.name));
