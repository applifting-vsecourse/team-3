/** A person an e-mail goes to. */
export type Recipient = { id: string; name: string; email: string };

/** What the e-mails about an event need to know of it. */
export type NotifiedEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  address: string;
  /** Why the organizer cancelled it; null when it isn't cancelled. */
  cancelReason: string | null;
  approvedCount: number;
  maxParticipants: number;
  organizerId: string;
};

/** When an event takes place. */
export type EventWhen = { startsAt: Date; endsAt: Date | null };

/**
 * What the organizer changed of the time or the place of an event: null for
 * what stayed. For the place, `from` and `to` are the addresses; they can be
 * equal when only the pin on the map moved.
 */
export type EventChange = {
  when: { from: EventWhen; to: EventWhen } | null;
  place: { from: string; to: string } | null;
};

/**
 * Something that happened to an event or to somebody's place in it, and that
 * somebody should hear about (#177). The services raise these after the change
 * is written; `NotificationService` turns each into e-mails.
 *
 * To add a kind (e.g. the organizer's message to the participants, #176):
 * add it here, say who gets it in `NotificationService.recipientsOf`, and say
 * what it reads in `composeMessage`.
 */
export type Notification =
  /** The organizer hears of a request waiting for them. */
  | {
      type: 'request-received';
      eventId: string;
      applicantId: string;
      /** What the applicant wrote with the request (#175). */
      message: string | null;
    }
  /** The applicants hear whether their requests were approved or rejected. */
  | {
      type: 'request-decided';
      eventId: string;
      userIds: string[];
      outcome: 'approved' | 'rejected';
    }
  /** Everyone with a place or a request hears the time or the place changed. */
  | { type: 'event-changed'; eventId: string; change: EventChange }
  /** Everyone with a place or a request hears the event is cancelled, and why. */
  | { type: 'event-cancelled'; eventId: string }
  /** The organizer hears a participant gave up their place. */
  | { type: 'participant-left'; eventId: string; participantId: string };

export type NotificationType = Notification['type'];
