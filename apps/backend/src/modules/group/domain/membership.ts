import { GroupType, MemberRole, Membership, MembershipStatus } from './group';

/** Why a membership change is refused; the API sends it as `code` (B-053, B-054). */
export type MembershipError =
  | 'GROUP_INACTIVE'
  | 'MEMBER_BLOCKED'
  | 'NOT_MEMBER'
  | 'LAST_ADMIN'
  | 'NOT_PENDING';

/**
 * Joining (US-17): a public group takes the user in at once, a closed one
 * records a request for an admin. Asking again changes nothing, so a double
 * click doesn't fail.
 */
export function decideJoin(
  group: { type: GroupType; status: 'active' | 'inactive' },
  existing: Membership | null,
):
  | { kind: 'create'; status: 'active' | 'pending' }
  | { kind: 'unchanged'; status: MembershipStatus }
  | { kind: 'error'; error: MembershipError } {
  if (group.status !== 'active')
    return { kind: 'error', error: 'GROUP_INACTIVE' };
  if (existing?.status === 'blocked') {
    return { kind: 'error', error: 'MEMBER_BLOCKED' };
  }
  if (existing) return { kind: 'unchanged', status: existing.status };
  return {
    kind: 'create',
    status: group.type === 'public' ? 'active' : 'pending',
  };
}

/**
 * Leaving at any time (US-17), also withdrawing a pending request. The last
 * active admin can't leave, the group would have nobody to run it (B-054).
 * A block is the admin's decision and stays.
 */
export function decideLeave(
  existing: Membership | null,
  activeAdminCount: number,
): { kind: 'delete' } | { kind: 'error'; error: MembershipError } {
  if (!existing || existing.status === 'blocked') {
    return { kind: 'error', error: 'NOT_MEMBER' };
  }
  if (
    existing.role === 'admin' &&
    existing.status === 'active' &&
    activeAdminCount <= 1
  ) {
    return { kind: 'error', error: 'LAST_ADMIN' };
  }
  return { kind: 'delete' };
}

/** An admin approves or rejects only a request that is still pending. */
export function decideRequest(
  existing: Membership | null,
): { kind: 'ok' } | { kind: 'error'; error: MembershipError } {
  return existing?.status === 'pending'
    ? { kind: 'ok' }
    : { kind: 'error', error: 'NOT_PENDING' };
}

/** A person in the group's management (Figma D-07: Žádosti, Členové). */
export type GroupMemberEntry = {
  userId: string;
  name: string;
  role: MemberRole;
  /** When they asked (a request) or joined (a member). */
  since: Date;
};

export type GroupMembers = {
  /** Pending requests, oldest first. */
  requests: GroupMemberEntry[];
  /** Active members, admins first, then in the order they joined. */
  members: GroupMemberEntry[];
};
