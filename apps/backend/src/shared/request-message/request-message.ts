/** A message with a request to join an event or a group (#175). */
export const REQUEST_MESSAGE_MAX_LENGTH = 500;

/** The same text the app shows under the field, so a refusal reads the same from either side. */
export const REQUEST_MESSAGE_TOO_LONG = `Zpráva může mít nejvýš ${REQUEST_MESSAGE_MAX_LENGTH} znaků`;
export const REQUEST_MESSAGE_NOT_TEXT = 'Zpráva musí být text';

/**
 * What is stored with a membership or a participation: the message only
 * goes with a request (`pending`); joining at once has nobody to read it.
 */
export const requestMessageFor = (
  status: string,
  message: string | null | undefined,
): string | null => (status === 'pending' ? (message ?? null) : null);
