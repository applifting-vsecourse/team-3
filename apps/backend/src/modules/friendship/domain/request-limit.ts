/**
 * New friendship requests a day (#84): each one tells a person, in the centre and by e-mail
 * (#86), and the module has no other protection against repeated requests (README). Counted
 * from Prague midnight; a request sent again counts again, accepting someone's request never.
 * Hinge gives 8 likes a day for free; 20 leaves room for people one really knows.
 */
export const FRIEND_REQUESTS_PER_DAY = 20;

/** „Dnes ještě 5 přidání“: what is left of today's limit, never below zero. */
export function friendRequestsLeft(sentToday: number): number {
  return Math.max(0, FRIEND_REQUESTS_PER_DAY - sentToday);
}
