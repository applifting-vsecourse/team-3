/** A message with a request to join an event or a group (#175). */
export const REQUEST_MESSAGE_MAX_LENGTH = 500;

/**
 * What is stored with a membership or a participation: the message only
 * goes with a request (`pending`); joining at once has nobody to read it.
 */
export const requestMessageFor = (
  status: string,
  message: string | null | undefined,
): string | null => (status === 'pending' ? (message ?? null) : null);
