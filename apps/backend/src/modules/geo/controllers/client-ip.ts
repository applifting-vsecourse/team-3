/**
 * The visitor's address: Express's `request.ip`, like the rate limits
 * (#236). Behind the staging proxy (Coolify, `TRUST_PROXY_HOPS=1`) it is the
 * address that proxy saw — the last `X-Forwarded-For` entry it added —, so a
 * visitor can't set it by sending the header themselves. Without a trusted
 * proxy it is the connection's address (#299: the first `X-Forwarded-For`
 * entry was used before, which anyone can write).
 */
export function clientIp(request: {
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | undefined {
  return request.ip ?? request.socket?.remoteAddress;
}
