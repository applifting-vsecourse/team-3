/**
 * Lower case without diacritics: „Ústí nad Orlicí“ → „usti nad orlici“.
 * The base of a slug (catalog) and of comparing names (the IP table, #55).
 */
export const foldText = (value: string): string =>
  value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();
