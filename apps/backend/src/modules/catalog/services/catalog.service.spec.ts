import { ActivityCategory } from '@/modules/catalog/domain/activity';
import { Locality } from '@/modules/catalog/domain/locality';
import { CatalogRepository } from '@/modules/catalog/repositories/catalog.repository';
import { mock } from 'jest-mock-extended';
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

  it('passes an empty query through without a slug', async () => {
    const repository = mock<CatalogRepository>();
    repository.findLocalities.mockResolvedValue([aLocality()]);

    const service = new CatalogService(repository);
    await service.searchLocalities();

    expect(repository.findLocalities).toHaveBeenCalledWith({
      name: '',
      slug: undefined,
      limit: 50,
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
});
