import { ActivityCategory } from '@/modules/catalog/domain/activity';
import { Locality } from '@/modules/catalog/domain/locality';
import { CatalogRepository } from '@/modules/catalog/repositories/catalog.repository';
import { Injectable } from '@nestjs/common';

// Enough for a city with all its districts (Praha + Praha 1–22). Only a search
// is limited: without a query the whole catalog comes back, because the /akce
// locality filter resolves slugs from it and lists every locality.
const LOCALITY_LIMIT = 50;

const collator = new Intl.Collator('cs', { numeric: true });

/** "Plzeň" -> "plzen", the same shape as Locality.slug. */
export const toSlug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getActivityTree(): Promise<ActivityCategory[]> {
    return this.catalogRepository.getActivityTree();
  }

  /**
   * Locality autocomplete, or the whole catalog for an empty query. Matches the name, and also the slug so that
   * "plzen" finds "Plzeň". Cities come before districts, districts in natural
   * order ("Praha 2" before "Praha 10").
   */
  async searchLocalities(query = ''): Promise<Locality[]> {
    const name = query.trim();
    const localities = await this.catalogRepository.findLocalities({
      name,
      // "-" or "%" slugify to "" — searching for that would match everything.
      slug: toSlug(name) || undefined,
      limit: name ? LOCALITY_LIMIT : undefined,
    });
    return [...localities].sort(
      (a, b) =>
        Number(a.parentId !== null) - Number(b.parentId !== null) ||
        collator.compare(a.name, b.name),
    );
  }

  /**
   * A place from the online search as a locality: the one of that name within
   * 10 km if the catalog has it, or a new one. A second place of the same name
   * elsewhere gets its district in the name and the slug: „Lhota (Kladno)“.
   */
  async addPlace(place: {
    name: string;
    county?: string;
    lat: number;
    lng: number;
  }): Promise<Locality> {
    const name = place.name.trim();
    const county = place.county?.replace(/^okres\s+/i, '').trim();
    const named = await this.catalogRepository.findLocalitiesNamed(name);
    const same = named.find(
      (locality) =>
        (locality.name === name ||
          (county !== undefined && locality.name === `${name} (${county})`)) &&
        distanceKm(locality, place) <= SAME_PLACE_KM,
    );
    if (same) return same;
    const isNameTaken = named.some((locality) => locality.name === name);
    const fullName = isNameTaken && county ? `${name} (${county})` : name;
    const base = toSlug(fullName) || 'misto';
    let slug = base;
    for (let n = 2; await this.catalogRepository.isSlugTaken(slug); n++) {
      slug = `${base}-${n}`;
    }
    return this.catalogRepository.createLocality({
      slug,
      name: fullName,
      parentId: null,
      lat: place.lat,
      lng: place.lng,
    });
  }
}

/** Two places of the same name this close are one place. */
const SAME_PLACE_KM = 10;

// equirectangular distance: plenty at the scale of Czechia
const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const toRad = Math.PI / 180;
  const x = (b.lng - a.lng) * toRad * Math.cos(((a.lat + b.lat) / 2) * toRad);
  const y = (b.lat - a.lat) * toRad;
  return Math.hypot(x, y) * 6371;
};
