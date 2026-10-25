export const GROUP_TYPES = ['public', 'closed'] as const;
/** `public`: anyone joins at once; `closed`: membership is requested and an admin approves it (#46). */
export type GroupType = (typeof GROUP_TYPES)[number];

export type MemberRole = 'admin' | 'member';
/** `blocked` is set by an admin (#63); a blocked user can't join again. */
export type MembershipStatus = 'pending' | 'active' | 'blocked';
export type Membership = { role: MemberRole; status: MembershipStatus };

export const GROUP_NAME_MAX_LENGTH = 80;
export const GROUP_DESCRIPTION_MAX_LENGTH = 2000;

/** Filters of the group list (B-052, sprint 2: activity + locality, PO 19. 10.). */
export type GroupFilters = {
  /** A city includes all its districts ("Praha" = Praha 1–22), a district only itself. */
  localityId?: string;
  /** Activities and whole categories add up (OR). */
  activityIds?: string[];
  categoryIds?: string[];
};

/** A group as listed on /skupiny. */
export type GroupSummary = {
  id: string;
  name: string;
  type: GroupType;
  activity: {
    id: string;
    slug: string;
    name: string;
    category: { id: string; slug: string; name: string; icon: string };
  };
  locality: { id: string; slug: string; name: string };
  /** Approved members only (status `active`); pending requests don't count. */
  memberCount: number;
};

/** A group on its own page. */
export type GroupDetail = GroupSummary & {
  description: string | null;
  status: 'active' | 'inactive';
  /** Active admins, first appointed first. */
  admins: { id: string; name: string }[];
  /** The signed-in viewer's own membership; null for a visitor or a non-member. */
  viewerMembership: Membership | null;
};

/** What the founder fills in (D-06) and an admin can change later (D-07). */
export type GroupInput = {
  name: string;
  description: string | null;
  activityId: string;
  localityId: string;
  type: GroupType;
};

/** A group on „Moje“ (B-056): my own membership comes with it. */
export type MyGroup = GroupSummary & {
  membership: Membership & { status: 'active' | 'pending' };
};

/** „Moje“: my requests waiting for approval on top, then my groups, each by name. */
export const sortMyGroups = (groups: MyGroup[]): MyGroup[] =>
  [...groups].sort(
    (a, b) =>
      Number(b.membership.status === 'pending') -
        Number(a.membership.status === 'pending') ||
      a.name.localeCompare(b.name, 'cs'),
  );
