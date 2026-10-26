import { ActivityCategory } from '@/modules/catalog/domain/activity';
import { Locality } from '@/modules/catalog/domain/locality';
import { CatalogRepository } from '@/modules/catalog/repositories/catalog.repository';
import { mock, MockProxy } from 'jest-mock-extended';
import { CatalogService, toSlug } from './catalog.service';

const aLocality = (overrides: Partial<Locality> = {}): Locality => ({
  id: 'l-praha',
  slug: 'praha',
  name: 'Praha',
  parentId: null,
  lat: 50.0755,
  lng: 14.4378,
  ...overrides,
});

const district = (number: number): Locality =>
  aLocality({
    id: `l-praha-${number}`,
    slug: `praha-${number}`,
    name: `Praha ${number}`,
    parentId: 'l-praha',
  });

describe('CatalogService', () => {
  it('returns the activity tree from the repository', async () => {
    const tree: ActivityCategory[] = [
      {
        id: 'c1',
        slug: 'hry',
        name: 'Hry',
        icon: 'dice',
        activities: [
          { id: 'a1', slug: 'sachy', name: 'Šachy', keywords: ['šach'] },
        ],
      },
    ];
    const repository = mock<CatalogRepository>();
    repository.getActivityTree.mockResolvedValue(tree);

    const service = new CatalogService(repository);

    await expect(service.getActivityTree()).resolves.toEqual(tree);
  });

  it('lists the city before its districts, districts in natural order', async () => {
    const repository = mock<CatalogRepository>();
    repository.findLocalities.mockResolvedValue([
      district(10),
      district(2),
      aLocality(),
      district(1),
    ]);

    const service = new CatalogService(repository);
    const result = await service.searchLocalities('pra');

    expect(result.map((l) => l.name)).toEqual([
      'Praha',
      'Praha 1',
      'Praha 2',
      'Praha 10',
    ]);
  });

  it('searches by name and by slug, so a query without diacritics matches', async () => {
    const repository = mock<CatalogRepository>();
    repository.findLocalities.mockResolvedValue([]);

    const service = new CatalogService(repository);
    await service.searchLocalities('  Plzeň ');

    expect(repository.findLocalities).toHaveBeenCalledWith({
      name: 'Plzeň',
      slug: 'plzen',
      limit: 50,
    });
  });

  it('does not search by slug when the query has no letters or digits', async () => {
    const repository = mock<CatalogRepository>();
    repository.findLocalities.mockResolvedValue([]);

    const service = new CatalogService(repository);
    await service.searchLocalities('-');

    // an empty slug would match every locality
    expect(repository.findLocalities).toHaveBeenCalledWith({
      name: '-',
      slug: undefined,
      limit: 50,
    });
  });

  it('returns the whole catalog for an empty query (no slug, no limit)', async () => {
    const repository = mock<CatalogRepository>();
    repository.findLocalities.mockResolvedValue([aLocality()]);

    const service = new CatalogService(repository);
    await service.searchLocalities();

    expect(repository.findLocalities).toHaveBeenCalledWith({
      name: '',
      slug: undefined,
      limit: undefined,
    });
  });
});

describe('toSlug', () => {
  it('builds the same slugs the seed uses', () => {
    expect(toSlug('Praha 1')).toBe('praha-1');
    expect(toSlug('Ústí nad Labem')).toBe('usti-nad-labem');
    expect(toSlug('České Budějovice')).toBe('ceske-budejovice');
    expect(toSlug('Ľubovňa')).toBe('lubovna');
  });

  describe('addPlace (a place from the online search)', () => {
    const setup = (
      named: Locality[],
      takenSlugs: string[] = [],
    ): { repository: MockProxy<CatalogRepository>; service: CatalogService } => {
      const repository = mock<CatalogRepository>();
      repository.findLocalitiesNamed.mockResolvedValue(named);
      repository.isSlugTaken.mockImplementation((slug) =>
        Promise.resolve(takenSlugs.includes(slug)),
      );
      repository.createLocality.mockImplementation((locality) =>
        Promise.resolve({ id: 'l-new', ...locality }),
      );
      return { repository, service: new CatalogService(repository) };
    };
    const privrat = {
      name: 'Přívrat',
      county: 'okres Ústí nad Orlicí',
      lat: 49.9246,
      lng: 16.397,
    };

    it('a village the catalog does not have becomes a locality', async () => {
      const { service, repository } = setup([]);

      const locality = await service.addPlace(privrat);

      expect(locality).toEqual({
        id: 'l-new',
        slug: 'privrat',
        name: 'Přívrat',
        parentId: null,
        lat: 49.9246,
        lng: 16.397,
      });
      expect(repository.createLocality).toHaveBeenCalledTimes(1);
    });

    it('the same place again is the same locality, nothing new', async () => {
      const existing = aLocality({
        id: 'l-privrat',
        slug: 'privrat',
        name: 'Přívrat',
        lat: 49.925,
        lng: 16.398,
      });
      const { service, repository } = setup([existing]);

      expect(await service.addPlace(privrat)).toBe(existing);
      expect(repository.createLocality).not.toHaveBeenCalled();
    });

    it('a place of the same name elsewhere gets its district: „Lhota (Kladno)“', async () => {
      const lhotaPrahaVychod = aLocality({
        id: 'l-lhota',
        slug: 'lhota',
        name: 'Lhota',
        lat: 50.2432,
        lng: 14.6564,
      });
      const { service } = setup([lhotaPrahaVychod], ['lhota']);

      const locality = await service.addPlace({
        name: 'Lhota',
        county: 'okres Kladno',
        lat: 50.0886,
        lng: 14.0118,
      });

      expect(locality).toMatchObject({
        slug: 'lhota-kladno',
        name: 'Lhota (Kladno)',
      });
    });

    it('a taken slug gets a number', async () => {
      const { service } = setup([], ['privrat']);

      expect(await service.addPlace(privrat)).toMatchObject({
        slug: 'privrat-2',
      });
    });
  });
});
