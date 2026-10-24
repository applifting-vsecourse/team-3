export const GROUP_TYPES = ['public', 'closed'] as const;
/** `public`: anyone joins at once; `closed`: membership is requested and an admin approves it (#46). */
export type GroupType = (typeof GROUP_TYPES)[number];

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
};

/** What the founder fills in (D-06) and an admin can change later (D-07). */
export type GroupInput = {
  name: string;
  description: string | null;
  activityId: string;
  localityId: string;
  type: GroupType;
};
