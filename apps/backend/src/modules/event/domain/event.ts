import { Capacity } from './capacity';

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
  /** Only events that still miss people to reach the minimum. */
  missingOnly?: boolean;
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
