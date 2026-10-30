/** B-010: a strong password — at least 10 characters, with a letter and a digit. */
export const PASSWORD_MIN_LENGTH = 10;

const RULE = 'Heslo musí mít aspoň 10 znaků a obsahovat písmeno i číslici.';

/** What's wrong with a new password, in Czech for the form, or null when it's fine. */
export const passwordProblem = (password: string): string | null =>
  password.length < PASSWORD_MIN_LENGTH ||
  !/\p{L}/u.test(password) ||
  !/\d/.test(password)
    ? RULE
    : null;

/**
 * #153: why a password from a known data breach (Have I Been Pwned) is
 * refused — attackers try those first, whatever the rule above says.
 */
export const PASSWORD_COMPROMISED_MESSAGE =
  'Tohle heslo se objevilo mezi uniklými hesly z jiných webů a útočníci ho zkoušejí jako první. Zvol prosím jiné.';
