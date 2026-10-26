/** #153: a name has 2 to 60 characters (the messages below say so in words). */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

// Letters of any alphabet with their diacritics (a decomposed accent comes as
// a separate mark), a space, a hyphen, an apostrophe (straight, or curly as
// phones type it) and a dot. Nothing else: no digits, no <, no emoji.
const ALLOWED = /^[\p{L}\p{M} '’.-]$/u;
const LETTER = /\p{L}/u;
// Characters a message can't show in quotes: control and format characters
// (a tab, a new line, a zero-width joiner) and spaces other than the plain one.
const INVISIBLE = /^[\p{C}\p{Z}]$/u;

const WHAT_IS_ALLOWED =
  'Jméno může obsahovat jen písmena, mezery, pomlčky, apostrofy a tečky.';

/**
 * What's wrong with a person's name, in Czech for the form, or null when it's
 * fine. The first character that doesn't belong is named, so it's clear what
 * to fix. Leading and trailing spaces don't count towards the length.
 */
export const nameProblem = (name: string): string | null => {
  const characters = [...name];
  const stray = characters.find((character) => !ALLOWED.test(character));
  if (stray !== undefined) {
    return INVISIBLE.test(stray)
      ? `Jméno obsahuje neviditelný znak, třeba tabulátor nebo konec řádku. ${WHAT_IS_ALLOWED}`
      : `Znak „${stray}“ do jména nepatří. ${WHAT_IS_ALLOWED}`;
  }
  const length = [...name.trim()].length;
  if (length < NAME_MIN_LENGTH) return 'Jméno musí mít aspoň 2 znaky.';
  if (length > NAME_MAX_LENGTH) return 'Jméno může mít nejvýš 60 znaků.';
  if (!LETTER.test(name)) return 'Jméno musí obsahovat aspoň jedno písmeno.';
  return null;
};
