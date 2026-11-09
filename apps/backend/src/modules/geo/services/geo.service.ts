import { Locality } from '@/modules/catalog/domain/locality';
import { IpLocalityTable } from '@/modules/geo/domain/ip-locality-table';
import { GeoRepository } from '@/modules/geo/repositories/geo.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Inject, Injectable } from '@nestjs/common';

export const IP_LOCALITY_TABLE = Symbol('IP_LOCALITY_TABLE');

/** Where the default locality came from; none = all of Czechia. */
export type DefaultLocalitySource = 'home' | 'ip' | 'none';

export type DefaultLocality = {
  locality: Locality | null;
  source: DefaultLocalitySource;
};

/**
 * The locality lists start in (#55, B-027): the home locality from the
 * profile, otherwise a guess from the IP address, otherwise all of Czechia.
 * The address and the guess are not stored anywhere, logs included.
 */
@Injectable()
export class GeoService {
  /**
   * The table's towns by slug, looked up once each (review #274): they come
   * from the seed and don't change while the app runs. Only found ones are
   * kept, so a town seeded later is still found.
   */
  private readonly guessedTowns = new Map<string, Locality>();

  constructor(
    private readonly repository: GeoRepository,
    @Inject(IP_LOCALITY_TABLE) private readonly table: IpLocalityTable | null,
  ) {}

  private async townBySlug(slug: string): Promise<Locality | null> {
    const cached = this.guessedTowns.get(slug);
    if (cached) return cached;
    const town = await this.repository.findLocalityBySlug(slug);
    if (town) this.guessedTowns.set(slug, town);
    return town;
  }

  async defaultLocality(
    viewer: Identity | null,
    ip: string | undefined,
  ): Promise<DefaultLocality> {
    if (viewer) {
      const home = await this.repository.findHomeLocality(viewer.id);
      if (home) return { locality: home, source: 'home' };
    }

    const slug = ip ? this.table?.slugFor(ip) : undefined;
    const guess = slug ? await this.townBySlug(slug) : null;
    if (guess) return { locality: guess, source: 'ip' };

    return { locality: null, source: 'none' };
  }
}
