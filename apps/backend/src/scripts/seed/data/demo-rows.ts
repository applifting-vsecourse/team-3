import {
  DemoEvent,
  DemoGroup,
  resolveEndsAt,
  resolveStartsAt,
} from './demo-data';

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * MINUTE_IN_MS;

/**
 * Převod testovacích dat (#47) na řádky pro databázi. Čistá funkce bez Prismy,
 * aby šla otestovat a aby seed jen vkládal hotové hodnoty. Odkazy na aktivitu,
 * lokalitu a uživatele zůstávají jako slug / název / klíč, na id je převede seed.
 */

export type DemoGroupRow = {
  key: string;
  name: string;
  description: string;
  activitySlug: string;
  localitySlug: string;
  type: DemoGroup['type'];
  status: DemoGroup['status'];
  deactivatedAt: Date | null;
  members: {
    userKey: string;
    role: DemoGroup['members'][number]['role'];
    status: DemoGroup['members'][number]['status'];
    message: string | null;
  }[];
};

export type DemoEventRow = {
  key: string;
  title: string;
  description: string | null;
  activitySlug: string;
  startsAt: Date;
  endsAt: Date;
  lat: number;
  lng: number;
  address: string;
  localitySlug: string;
  minParticipants: number;
  maxParticipants: number;
  price: number | null;
  level: NonNullable<DemoEvent['level']> | null;
  equipment: string | null;
  approvalMode: DemoEvent['approvalMode'];
  visibility: DemoEvent['visibility'];
  organizerKey: string;
  status: DemoEvent['status'];
  cancelReason: string | null;
  cancelledAt: Date | null;
  participations: {
    userKey: string;
    status: DemoEvent['participations'][number]['status'];
    message: string | null;
    approvedAt: Date | null;
  }[];
};

export const toGroupRow = (group: DemoGroup, now: Date): DemoGroupRow => ({
  key: group.key,
  name: group.name,
  description: group.description,
  activitySlug: group.activitySlug,
  localitySlug: group.localitySlug,
  type: group.type,
  status: group.status,
  deactivatedAt:
    group.status === 'inactive'
      ? new Date(now.getTime() - (group.deactivatedDaysAgo ?? 0) * DAY_IN_MS)
      : null,
  members: group.members.map((member) => ({
    userKey: member.userKey,
    role: member.role,
    status: member.status,
    message: member.message ?? null,
  })),
});

export const toEventRow = (event: DemoEvent, now: Date): DemoEventRow => {
  const count = event.participations.length;
  return {
    key: event.key,
    title: event.title,
    description: event.description ?? null,
    activitySlug: event.activitySlug,
    startsAt: resolveStartsAt(event.schedule, now),
    endsAt: resolveEndsAt(event, now),
    lat: event.lat,
    lng: event.lng,
    address: event.address,
    localitySlug: event.localitySlug,
    minParticipants: event.minParticipants,
    maxParticipants: event.maxParticipants,
    price: event.price ?? null,
    level: event.level ?? null,
    equipment: event.equipment ?? null,
    approvalMode: event.approvalMode,
    visibility: event.visibility,
    organizerKey: event.organizerKey,
    status: event.status,
    cancelReason: event.cancelReason ?? null,
    cancelledAt: event.status === 'cancelled' ? now : null,
    // Schválení po minutách v pořadí ze souboru, aby řazení účastníků podle data
    // schválení (správa akce, D-03) bylo stabilní a odpovídalo testovacím datům.
    participations: event.participations.map((participation, index) => ({
      userKey: participation.userKey,
      status: participation.status,
      message: participation.message ?? null,
      approvedAt:
        participation.status === 'approved'
          ? new Date(now.getTime() - (count - index) * MINUTE_IN_MS)
          : null,
    })),
  };
};
