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
};

/** An event as listed publicly, on the list and on the map. */
export type PublicEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  address: string;
  lat: number;
  lng: number;
  activity: {
    id: string;
    slug: string;
    name: string;
    category: { id: string; slug: string; name: string; icon: string };
  };
  locality: { id: string; slug: string; name: string };
  organizer: { id: string; name: string };
  /** Set for a group's event (B-055); the group is then shown as the organizer. */
  group: { id: string; name: string } | null;
  minParticipants: number;
  maxParticipants: number;
  capacity: Capacity;
  isPromoted: boolean;
};

/** An approved participant, as listed on the event detail. */
export type EventParticipant = { id: string; name: string };

/** An event on its detail page (B-026). */
export type EventDetail = PublicEvent & {
  description: string | null;
  approvalMode: 'open' | 'approval';
  /** `private` = reachable through its link only; `members` = the group's members only. */
  visibility: 'public' | 'private' | 'members';
  /** `hidden` and `deleted` never leave the service (404). */
  status: 'published' | 'cancelled' | 'hidden' | 'deleted';
  cancelReason: string | null;
};

/** The detail and, for a signed-in viewer, who is coming; a visitor gets only the count. */
export type EventDetailView = EventDetail & {
  participants: EventParticipant[] | null;
  /** The signed-in viewer's own participation; null for a visitor or someone not in. */
  myParticipation: 'pending' | 'approved' | 'rejected' | 'removed' | null;
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
};
