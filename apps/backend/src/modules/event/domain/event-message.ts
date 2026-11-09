import { EventViewer } from './event-viewer';
import { canSeeParticipants } from './participant-visibility';

// Like a group announcement (#194): a subject fits one line, the text a few paragraphs.
export const MESSAGE_SUBJECT_MAX_LENGTH = 120;
export const MESSAGE_BODY_MAX_LENGTH = 2000;
/** Messages one event may send in one Prague calendar day (B-042, #176, Figma D-04). */
export const MESSAGES_PER_DAY = 10;
/** The detail shows the latest ones; older messages stay in the participants' e-mail. */
export const MESSAGES_SHOWN = 50;

/** Why a message is refused; the API sends it as `code`. */
export type MessageRefusal = 'EVENT_CANCELLED' | 'MESSAGE_LIMIT';

export type MessageInput = { subject: string; body: string };

/** A message on the event's detail (Figma A-05c, „Zprávy od organizátora“). */
export type EventMessage = {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  sender: { id: string; name: string };
};

export type EventMessages = {
  /** Newest first, at most MESSAGES_SHOWN. */
  messages: EventMessage[];
  /** All the event's messages, also the older ones not in the list (the heading's count). */
  total: number;
  /** How many more the viewer may send today; null unless they may send at all. */
  remainingToday: number | null;
};

/**
 * Who reads the messages (#176): exactly who sees „Kdo jde“ (#174) — the
 * organizer, an approved participant and, for a group's event, the group's
 * members and admins. A waiting applicant or a visitor doesn't.
 */
export const canReadMessages = (viewer: EventViewer): boolean =>
  canSeeParticipants(viewer);

/**
 * Only the organizer of a published event writes to its participants: not a
 * group's admin who manages it (the messages speak for the organizer), and
 * not after it was cancelled.
 */
export const canSendMessages = (
  event: { status: 'published' | 'cancelled' | 'hidden' | 'deleted' },
  viewer: EventViewer,
): boolean => event.status === 'published' && viewer?.isOrganizer === true;

export const remainingMessages = (sentToday: number): number =>
  Math.max(0, MESSAGES_PER_DAY - sentToday);

/**
 * Decided under a lock on the event row, so a cancel or a second message at
 * the same moment can't slip past it.
 */
export const decideMessage = (state: {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  sentToday: number;
}): { ok: true } | { ok: false; refusal: MessageRefusal } => {
  if (state.eventStatus !== 'published') {
    return { ok: false, refusal: 'EVENT_CANCELLED' };
  }
  if (remainingMessages(state.sentToday) === 0) {
    return { ok: false, refusal: 'MESSAGE_LIMIT' };
  }
  return { ok: true };
};
