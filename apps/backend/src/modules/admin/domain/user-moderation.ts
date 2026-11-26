/**
 * Blocking a user (PO 26. 11., B-063): „Čekal bych, že jako superadmin se můžu již v profilu
 * uživatele rozhodnout a buttonem toho uživatele zablokovat.“ A blocked user can't sign in
 * to anything that needs a verified account (`VerifiedUserGuard`: 403 USER_BLOCKED), their
 * sessions end and their profile is gone for others; the superadmin can unblock them.
 */
export type BlockState = {
  role: string;
  blockedAt: Date | null;
  isSelf: boolean;
};

export type UserModerationRefusal =
  | 'CANNOT_BLOCK_SELF'
  | 'CANNOT_BLOCK_ADMIN'
  | 'USER_ALREADY_BLOCKED'
  | 'USER_NOT_BLOCKED';

export type UserModerationDecision =
  { ok: true } | { ok: false; refusal: UserModerationRefusal };

/** Not oneself, not another superadmin, not twice. */
export function decideBlock(state: BlockState): UserModerationDecision {
  if (state.isSelf) return { ok: false, refusal: 'CANNOT_BLOCK_SELF' };
  if (state.role === 'admin') {
    return { ok: false, refusal: 'CANNOT_BLOCK_ADMIN' };
  }
  if (state.blockedAt) return { ok: false, refusal: 'USER_ALREADY_BLOCKED' };
  return { ok: true };
}

/** Only a blocked user. */
export function decideUnblock(state: BlockState): UserModerationDecision {
  return state.blockedAt
    ? { ok: true }
    : { ok: false, refusal: 'USER_NOT_BLOCKED' };
}
