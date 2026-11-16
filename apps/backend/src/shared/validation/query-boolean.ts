/**
 * `@Transform(queryBoolean)` for a boolean in the query string (`?interests=true`): it arrives as
 * a string. „true“ and „false“ become booleans, anything else stays as it is, so `@IsBoolean()`
 * refuses it with a 400.
 */
export const queryBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;
