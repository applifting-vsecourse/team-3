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

/** #154: the name an account gets when its own one can't be made to pass. */
export const FALLBACK_NAME = 'Bez jména';

/**
 * A name that comes from elsewhere (a Google profile, #154) made to pass the
 * rule instead of refusing the sign-in: the characters that don't belong are
 * left out and the rest cut to 60 characters. One that still doesn't pass
 * (only digits or emoji) becomes FALLBACK_NAME, which can be changed later.
 */
export const toValidName = (name: string | undefined): string => {
  const kept = [...(name ?? '')]
    .filter((character) => ALLOWED.test(character))
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim();
  const cut = [...kept].slice(0, NAME_MAX_LENGTH).join('').trim();
  return nameProblem(cut) === null ? cut : FALLBACK_NAME;
};
