import { Membership } from './group';

// Like an event title and a group description: a subject fits one line, the text a few paragraphs.
export const ANNOUNCEMENT_SUBJECT_MAX_LENGTH = 120;
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 2000;
/**
 * Announcements a group may send in one Prague calendar day (#194, Figma
 * D-08): the same as an organizer's messages to one event (#176).
 */
export const ANNOUNCEMENTS_PER_DAY = 10;
/** The group page shows the latest ones; older announcements stay in the members' e-mail. */
export const ANNOUNCEMENTS_SHOWN = 50;

/** Why an announcement is refused; the API sends it as `code`. */
export type AnnouncementRefusal = 'GROUP_INACTIVE' | 'ANNOUNCEMENT_LIMIT';

export type AnnouncementInput = { subject: string; body: string };

/** An announcement on the group page (Figma A-08e). */
export type GroupAnnouncement = {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  sender: { id: string; name: string };
};

export type GroupAnnouncements = {
  /** Newest first, at most ANNOUNCEMENTS_SHOWN. */
  announcements: GroupAnnouncement[];
  /** All the group's announcements, also the older ones not in the list (the heading's count). */
  total: number;
  /** How many more the viewer may send today; null unless they may send at all. */
  remainingToday: number | null;
};

/** Only active members and admins read the announcements; a pending request or a block is not membership. */
export const canReadAnnouncements = (membership: Membership | null): boolean =>
  membership?.status === 'active';

/** Only an active admin of an active group sends them. */
export const canSendAnnouncements = (
  group: { status: 'active' | 'inactive' },
  membership: Membership | null,
): boolean =>
  group.status === 'active' &&
  membership?.role === 'admin' &&
  membership.status === 'active';

export const remainingAnnouncements = (sentToday: number): number =>
  Math.max(0, ANNOUNCEMENTS_PER_DAY - sentToday);

/**
 * Decided under a lock on the group row, so a deactivation or a second
 * announcement at the same moment can't slip past it.
 */
export const decideAnnouncement = (state: {
  groupStatus: 'active' | 'inactive';
  sentToday: number;
}): { ok: true } | { ok: false; refusal: AnnouncementRefusal } => {
  if (state.groupStatus !== 'active') {
    return { ok: false, refusal: 'GROUP_INACTIVE' };
  }
  if (remainingAnnouncements(state.sentToday) === 0) {
    return { ok: false, refusal: 'ANNOUNCEMENT_LIMIT' };
  }
  return { ok: true };
};
