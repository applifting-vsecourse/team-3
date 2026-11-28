import type { RatingSummary } from '@/modules/rating/domain/rating-summary';
import { LatLng } from '@/shared/geo/distance';
import { BoundingBox } from './bounding-box';
import { Capacity, CapacityFilter } from './capacity';

/** Filters of the public event list (B-023, sprint 2 version). */
export type PublicEventFilters = {
  /** A city includes all its districts ("Praha" = Praha 1–22), a district only itself. */
  localityId?: string;
  /** Prague calendar day "YYYY-MM-DD", inclusive. */
  dateFrom?: string;
  /** Prague calendar day "YYYY-MM-DD", inclusive. */
  dateTo?: string;
  /** Activities and whole categories add up (OR). */
  activityIds?: string[];
  categoryIds?: string[];
  /** `free`: not full yet; `missing`: still missing people to reach the minimum. */
  capacity?: CapacityFilter;
  /**
   * Only events whose place is in the map's visible area (#56); adds up with the locality (AND).
   * /akce sends no locality with it: there the area replaces the locality.
   */
  bbox?: BoundingBox;
  /** Words found in the title, the activity's name or its keywords, without diacritics (#57). */
  q?: string;
  /** Where distances are measured from: the centre of the chosen locality (#57). */
  point?: LatLng;
  /** Only events at most this far from `point` („okolí +10 km“, #57). */
  radiusKm?: number;
  /**
   * Proběhlé (#61): events that are over (`eventOverWhere`, #272), newest
   * first, instead of the upcoming ones. Still only published public events.
   */
  past?: boolean;
};

/**
 * Order of the public event list (B-023): `date` soonest first, the default;
 * `popular` the most interest first (#156, `rankByInterest`); `distance` the
 * nearest to `point` first (#57).
 */
export const PUBLIC_EVENT_SORTS = ['date', 'popular', 'distance'] as const;
export type PublicEventSort = (typeof PUBLIC_EVENT_SORTS)[number];

/** An event as listed publicly, on the list and on the map. */
export type PublicEvent = {
  id: string;
  title: string;
  /** The start of the description for the map preview (#56, `summarize`); null without one. */
  summary: string | null;
  startsAt: Date;
  endsAt: Date | null;
  address: string;
  lat: number;
  lng: number;
  activity: {
    id: string;
    slug: string;
    name: string;
    /** What the search finds it by besides the name (#57); not in the API. */
    keywords: string[];
    category: { id: string; slug: string; name: string; icon: string };
  };
  locality: { id: string; slug: string; name: string };
  organizer: { id: string; name: string };
  /** Set for a group's event (B-055); the group is then shown as the organizer. */
  group: { id: string; name: string } | null;
  minParticipants: number;
  maxParticipants: number;
  /** `approval`: a request the organizer approves; the landing page asks, not promises (QA-06). */
  approvalMode: 'open' | 'approval';
  capacity: Capacity;
  isPromoted: boolean;
  /** The organizer's own image (#77), served at `/api/images/:key`; null = the activity's photo. */
  imageKey: string | null;
  /** From the filters' `point`, null without one (#57). */
  distanceKm: number | null;
  /** Proběhlé only (#61): the event's average rating, for its past card. */
  rating?: RatingSummary;
};

/** An approved participant, as listed on the event detail. */
export type EventParticipant = { id: string; name: string };

/**
 * A request waiting for the organizer (#53), with when it was sent and the
 * applicant's message (#175). Only the organizer's management gets it.
 */
export type EventRequest = {
  id: string;
  name: string;
  requestedAt: Date;
  message: string | null;
};

/** What the organizer's management page lists (#43, #53). */
export type EventManagementView = {
  participants: EventParticipant[];
  requests: EventRequest[];
};

/** An event on its detail page (B-026). */
export type EventDetail = PublicEvent & {
  description: string | null;
  approvalMode: 'open' | 'approval';
  /** The organizer's e-mail for each sign-up to an open event (#86); the API shows it only to who manages it. */
  emailOnJoin: boolean;
  /** `private` = reachable through its link only; `members` = the group's members only. */
  visibility: 'public' | 'private' | 'members';
  /** `deleted` never leaves the service (404), `hidden` only to the superadmin (#308). */
  status: 'published' | 'cancelled' | 'hidden' | 'deleted';
  cancelReason: string | null;
};

/** The detail and, for those taking part, who is coming (#174, `canSeeParticipants`). */
export type EventDetailView = Omit<EventDetail, 'emailOnJoin'> & {
  /**
   * The organizer's e-mail for each sign-up (#86), only for the organizer: it goes to them, so
   * a fellow admin of the group neither sees nor changes it (review #398). Null for anyone else.
   */
  emailOnJoin: boolean | null;
  /** Null for anyone who may not see the names; they get only `capacity`. */
  participants: EventParticipant[] | null;
  /** The signed-in viewer's own participation; null for a visitor or someone not in. */
  myParticipation: 'pending' | 'approved' | 'rejected' | 'removed' | null;
  /**
   * Whether the server saw a signed-in viewer. Lets the app tell an expired
   * session from a signed-in user who just doesn't get the names (#174).
   */
  viewerSignedIn: boolean;
  /** Whether the viewer manages the event (B-055, `canManageEvent`). */
  canManage: boolean;
  /** Whether the viewer may edit it: who manages it, and the superadmin (#308). */
  canEdit: boolean;
  /** The superadmin (#308): may deactivate and restore the event. */
  canModerate: boolean;
  /** Why it was deactivated; only for the superadmin, null for anyone else (#308, review #380). */
  hiddenReason: string | null;
};

/** The two sections of a group's page (B-055): Nadcházející and Proběhlé. */
export type GroupEventsWhen = 'upcoming' | 'past';

/** An event on its group's page (B-055): members-only ones are marked. */
export type GroupEvent = PublicEvent & { visibility: 'public' | 'members' };

/** A group's events, as its page lists them. */
export type GroupEvents = { upcoming: GroupEvent[]; past: GroupEvent[] };

/**
 * Tabs of „Moje akce“ (B-035). Under `organizing` are the events of the groups
 * I'm an admin of too (B-055). `groups`: Moje › Akce › Z mých skupin (#304),
 * events of my groups I don't go to yet. `past`: Moje › Akce › Proběhlé
 * (#367), the history that used to be on the profile.
 */
export const MY_EVENTS_TABS = [
  'attending',
  'organizing',
  'groups',
  'past',
] as const;
export type MyEventsTab = (typeof MY_EVENTS_TABS)[number];

/** An event in „Moje akce“: with the user's own place in it. */
export type MyEvent = PublicEvent & {
  /** A cancelled event stays in the list with its label (Q11). */
  status: 'published' | 'cancelled';
  /** Only a place that is still on; withdrawn, rejected and removed aren't listed. */
  myParticipation: 'approved' | 'pending' | null;
  /** Requests waiting for the organizer; null under `attending`, which isn't the user's business. */
  pendingRequests: number | null;
  /**
   * The stars I gave the event (#66), so Proběhlé shows „tvoje ★ N“ instead of „Ohodnotit“
   * (#367); null while I haven't rated it, or the rating was deleted by moderation.
   */
  myEventStars: number | null;
  /**
   * My rating was deleted by moderation: Proběhlé offers no „Ohodnotit“, as it can only be
   * restored, not given again (RATING_DELETED, #367). False under the other tabs.
   */
  myRatingDeleted: boolean;
};

/** What the organizer fills in when creating an event (B-021). */
export type NewEvent = {
  title: string;
  description: string | null;
  activityId: string;
  localityId: string;
  lat: number;
  lng: number;
  address: string;
  startsAt: Date;
  endsAt: Date | null;
  minParticipants: number;
  maxParticipants: number;
  approvalMode: 'open' | 'approval';
  /** An e-mail to the organizer for each sign-up to an open event (#86). */
  emailOnJoin: boolean;
  /** A group's event (B-055); null for a person's own. */
  groupId: string | null;
  /** `members` only for a group's event. */
  visibility: 'public' | 'members';
};

/** What the organizer may change on an event (B-028, #41): not the activity nor the way of joining. */
export type EventChanges = Partial<
  Pick<
    NewEvent,
    | 'title'
    | 'description'
    | 'localityId'
    | 'lat'
    | 'lng'
    | 'address'
    | 'startsAt'
    | 'endsAt'
    | 'minParticipants'
    | 'maxParticipants'
    | 'emailOnJoin'
  >
>;
