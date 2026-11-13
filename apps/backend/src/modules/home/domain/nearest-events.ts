import { PublicEvent } from '@/modules/event/domain/event';
import { distanceKm } from '@/shared/geo/distance';
import { HomeLocalityCenter } from './home-sections';

/**
 * How many of the nearest events the landing page picks its sections from
 * when its locality has none (#299): enough for the panel and every section
 * (1 + 6 × 3), with some to spare for the rules that skip full events or the
 * viewer's own.
 */
export const NEAREST_POOL = 30;

/**
 * The events nearest to the centre, each with its distance to one decimal as
 * the cards show it („· 22,7 km“), nearest first and equally far soonest
 * first (the input is soonest first and the sort is stable). For a locality
 * with no events of its own (#299): its sections then come from these.
 */
export const nearestEvents = (
  events: PublicEvent[],
  center: HomeLocalityCenter,
  limit: number = NEAREST_POOL,
): PublicEvent[] =>
  events
    .map((event) => ({ event, km: distanceKm(center, event) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map(({ event, km }) => ({
      ...event,
      distanceKm: Math.round(km * 10) / 10,
    }));
