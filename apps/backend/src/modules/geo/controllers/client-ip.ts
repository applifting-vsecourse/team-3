/**
 * The visitor's address. Behind the staging proxy (Coolify) the socket is
 * the proxy, so the first `X-Forwarded-For` entry wins. A visitor can fake
 * it, but only to change their own guessed locality.
 */
export function clientIp(request: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();
  return first || request.socket?.remoteAddress;
}
