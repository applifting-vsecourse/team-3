import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Locality } from '@/modules/catalog/domain/locality';
import { IpLocalityTable } from '@/modules/geo/domain/ip-locality-table';
import { GeoRepository } from '@/modules/geo/repositories/geo.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock, MockProxy } from 'jest-mock-extended';
import { GeoService } from './geo.service';

const brno: Locality = {
  id: 'l-brno',
  slug: 'brno',
  name: 'Brno',
  parentId: null,
  lat: 49.1951,
  lng: 16.6068,
};
const praha7: Locality = {
  id: 'l-praha-7',
  slug: 'praha-7',
  name: 'Praha 7',
  parentId: 'l-praha',
  lat: 50.1,
  lng: 14.43,
};
const user = new Identity('u1', 'petra@example.com', 'Petra', 'user');
const BRNO_IP = '5.0.0.1';
const table = new IpLocalityTable('05000000 050000ff brno');

describe('GeoService.defaultLocality', () => {
  let repository: MockProxy<GeoRepository>;
  let service: GeoService;

  beforeEach(() => {
    repository = mock<GeoRepository>();
    repository.findHomeLocality.mockResolvedValue(null);
    repository.findLocalityBySlug.mockImplementation(async (slug) =>
      slug === 'brno' ? brno : null,
    );
    service = new GeoService(repository, table);
  });

  it('gives a signed-in user the home locality, whatever the IP', async () => {
    repository.findHomeLocality.mockResolvedValue(praha7);
    await expect(service.defaultLocality(user, BRNO_IP)).resolves.toEqual({
      locality: praha7,
      source: 'home',
    });
  });

  it('guesses from the IP without a home locality', async () => {
    await expect(service.defaultLocality(user, BRNO_IP)).resolves.toEqual({
      locality: brno,
      source: 'ip',
    });
    await expect(service.defaultLocality(null, BRNO_IP)).resolves.toEqual({
      locality: brno,
      source: 'ip',
    });
    expect(repository.findHomeLocality).toHaveBeenCalledTimes(1);
  });

  it('falls back to all of Czechia when the IP says nothing', async () => {
    for (const ip of ['127.0.0.1', '8.8.8.8', 'unknown', undefined]) {
      await expect(service.defaultLocality(null, ip)).resolves.toEqual({
        locality: null,
        source: 'none',
      });
    }
  });

  it('falls back to all of Czechia when the guessed town is not in the catalog', async () => {
    repository.findLocalityBySlug.mockResolvedValue(null);
    await expect(service.defaultLocality(null, BRNO_IP)).resolves.toEqual({
      locality: null,
      source: 'none',
    });
  });

  it('falls back to all of Czechia without the IP table', async () => {
    service = new GeoService(repository, null);
    await expect(service.defaultLocality(null, BRNO_IP)).resolves.toEqual({
      locality: null,
      source: 'none',
    });
  });
});

describe('the committed IP table', () => {
  it('knows a Prague address and nothing of a foreign one', () => {
    const committed = new IpLocalityTable(
      readFileSync(join(__dirname, '../data/ip-localities-cz.txt'), 'utf8'),
    );
    expect(committed.slugFor('88.102.204.10')).toBe('praha');
    expect(committed.slugFor('8.8.8.8')).toBeUndefined();
  });
});
