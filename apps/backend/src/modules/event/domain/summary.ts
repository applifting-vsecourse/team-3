/** The preview on the map (#56) shows a line or two of the description, not all of it. */
export const SUMMARY_MAX_LENGTH = 160;

/**
 * The start of a description for a preview: whitespace and line breaks as
 * single spaces, cut at a whole word with „…“ when longer than `max`. Null
 * for no description, so the preview leaves the line out.
 */
export function summarize(
  description: string | null,
  max = SUMMARY_MAX_LENGTH,
): string | null {
  const text = description?.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  // a single long word is cut where it has to be
  const words = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return `${words.replace(/[\s,.;:–-]+$/, '')}…`;
}
