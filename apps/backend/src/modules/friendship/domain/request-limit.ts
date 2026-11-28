/**
 * New friendship requests a day (#84): each one tells a person, in the centre and by e-mail
 * (#86), and the module has no other protection against repeated requests (README). Counted
 * from Prague midnight; a request sent again counts again, accepting someone's request never.
 * Hinge gives 8 likes a day for free; 20 leaves room for people one really knows.
 *
 * Ready for the paid plan (#473, B-071): the plan raises the limit, it never removes it —
 * the limit is spam protection first.
 */
export const REQUEST_PLANS = ['free', 'plus'] as const;
export type RequestPlan = (typeof REQUEST_PLANS)[number];

/** Everybody's plan until B-071 brings entitlements from the (simulated) payment. */
export const DEFAULT_REQUEST_PLAN: RequestPlan = 'free';

const REQUESTS_PER_DAY: Record<RequestPlan, number> = { free: 20, plus: 50 };

/** The one place the daily limit comes from: profile, deck and invite alike. */
export function dailyRequestLimit(plan: RequestPlan): number {
  return REQUESTS_PER_DAY[plan];
}

/** The highest limit any plan has, for the API docs. */
export const MAX_DAILY_REQUEST_LIMIT = Math.max(
  ...REQUEST_PLANS.map(dailyRequestLimit),
);

/** Where today's limit stands, as the API gives it (`limit` in Najdi parťáka). */
export type FriendRequestLimit = {
  /** „Dnes ještě 5 přidání“: never below zero. */
  left: number;
  perDay: number;
  /** The next Prague midnight, ISO: when `left` is `perDay` again. */
  resetsAt: string;
  plan: RequestPlan;
};

/** Today's limit from the requests sent since Prague midnight. */
export function friendRequestLimit(
  sentToday: number,
  plan: RequestPlan,
  resetsAt: Date,
): FriendRequestLimit {
  const perDay = dailyRequestLimit(plan);
  return {
    left: Math.max(0, perDay - sentToday),
    perDay,
    resetsAt: resetsAt.toISOString(),
    plan,
  };
}
