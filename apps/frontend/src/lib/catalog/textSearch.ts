/**
 * Text as a catalog search compares it: lower case, without diacritics, a dash
 * or a run of spaces as one space. So „usti nad orl“ finds Ústí nad Orlicí and
 * „frydek mistek“ finds Frýdek-Místek.
 */
export const foldText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("cs")
    .replace(/[\s\p{Dash}]+/gu, " ")
    .trim()

/**
 * How well a folded text matches a folded query: 0 it starts with it, 1 one of
 * its words does („Sezimovo Ústí“ for „usti“), 2 it is somewhere inside;
 * undefined when it doesn't match.
 */
export function matchRank(text: string, query: string): number | undefined {
  const at = text.indexOf(query)
  if (at === -1) return undefined
  if (at === 0) return 0
  return text.includes(` ${query}`) ? 1 : 2
}
