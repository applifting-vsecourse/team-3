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
}
