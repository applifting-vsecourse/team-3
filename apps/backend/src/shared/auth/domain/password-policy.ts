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
