/** An event's status as moderation reads it under the event's lock. */
export type ModeratedStatus = 'published' | 'cancelled' | 'hidden' | 'deleted';

/** Why the superadmin can't deactivate or restore the event (#308). */
export type ModerationRefusal =
  'EVENT_CANCELLED' | 'EVENT_ALREADY_HIDDEN' | 'EVENT_NOT_HIDDEN';

export type ModerationDecision =
  { ok: true } | { ok: false; refusal: ModerationRefusal };

/**
 * Whether the superadmin may deactivate the event (#308, B-063): only a
 * published one, past ones too (they are on profiles and under Proběhlé).
 * A cancelled event is no longer offered to anyone and stays cancelled:
 * cancelling can't be undone, deactivating can. A deleted event is the
 * caller's 404.
 */
export function decideHide(status: ModeratedStatus): ModerationDecision {
  if (status === 'published') return { ok: true };
  if (status === 'hidden')
    return { ok: false, refusal: 'EVENT_ALREADY_HIDDEN' };
  return { ok: false, refusal: 'EVENT_CANCELLED' };
}

/** Restoring brings a deactivated event back as published (#308). */
export function decideUnhide(status: ModeratedStatus): ModerationDecision {
  return status === 'hidden'
    ? { ok: true }
    : { ok: false, refusal: 'EVENT_NOT_HIDDEN' };
}

/** The longest reason the history keeps (B-063, the same as cancelling). */
export const MODERATION_REASON_MAX_LENGTH = 500;

/** Why a reason was refused; the API answers 400 with the code. */
export type ReasonRefusal = 'REASON_REQUIRED' | 'REASON_TOO_LONG';

/**
 * The reason as the history keeps it (#308, review #380): trimmed, then
 * required (blanks are no reason) and at most 500 characters. The DTO checks
 * the same; this keeps a blank reason out of `ModerationAction` whoever calls.
 */
export function moderationReason(
  raw: string,
): { ok: true; reason: string } | { ok: false; refusal: ReasonRefusal } {
  const reason = raw.trim();
  if (!reason) return { ok: false, refusal: 'REASON_REQUIRED' };
  if (reason.length > MODERATION_REASON_MAX_LENGTH) {
    return { ok: false, refusal: 'REASON_TOO_LONG' };
  }
  return { ok: true, reason };
}
