/**
 * A name or a label as it reads inside a sentence: „Florbal“ → „florbal“, „Sešlo se 6 lidí“ →
 * „sešlo se 6 lidí“, „Pá 23. 10.“ → „pá 23. 10.“. A first word with another capital stays as
 * it is — an acronym or a brand („RPG (D&D apod.)“, „CrossFit“) would break (review #269).
 * The one place that lowercases a first letter; never inline it.
 */
export function inSentence(text: string): string {
  const firstWord = text.split(/\s/, 1)[0] ?? ""
  if (/\p{Lu}/u.test(firstWord.slice(1))) return text
  return `${text.charAt(0).toLocaleLowerCase("cs")}${text.slice(1)}`
}
