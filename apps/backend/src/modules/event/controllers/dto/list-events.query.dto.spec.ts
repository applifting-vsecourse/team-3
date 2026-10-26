import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListEventsQueryDto } from './list-events.query.dto';

// Same transform the controller's ValidationPipe runs on the raw query string.
const parse = (
  query: Record<string, unknown>,
): { dto: ListEventsQueryDto; invalid: string[] } => {
  const dto = plainToInstance(ListEventsQueryDto, query);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, invalid: errors.map((error) => error.property) };
};

describe('ListEventsQueryDto', () => {
  it('accepts an empty query', () => {
    expect(parse({}).invalid).toEqual([]);
  });

  it('turns a single activityId into an array and keeps repeated ones', () => {
    expect(parse({ activityId: 'a1' }).dto.activityId).toEqual(['a1']);
    expect(parse({ categoryId: ['c1', 'c2'] }).dto.categoryId).toEqual([
      'c1',
      'c2',
    ]);
  });

  it('accepts capacity free or missing and rejects anything else', () => {
    expect(parse({ capacity: 'free' }).dto.capacity).toBe('free');
    expect(parse({ capacity: 'missing' }).invalid).toEqual([]);
    expect(parse({ capacity: 'full' }).invalid).toEqual(['capacity']);
    expect(parse({ capacity: 'true' }).invalid).toEqual(['capacity']);
  });

  it('accepts sort date or popular and rejects anything else', () => {
    expect(parse({ sort: 'popular' }).dto.sort).toBe('popular');
    expect(parse({ sort: 'date' }).invalid).toEqual([]);
    expect(parse({ sort: 'interest' }).invalid).toEqual(['sort']);
    expect(parse({ sort: '' }).invalid).toEqual(['sort']);
  });

  it('turns limit into a whole number from 1 to 200', () => {
    expect(parse({ limit: '6' }).dto.limit).toBe(6);
    expect(parse({ limit: '1' }).invalid).toEqual([]);
    expect(parse({ limit: '200' }).invalid).toEqual([]);
    for (const limit of ['0', '201', '2.5', 'six', '', ['6', '7']]) {
      expect(parse({ limit }).invalid).toEqual(['limit']);
    }
  });

  it('rejects a range that ends before it starts; a one-day range is fine', () => {
    expect(
      parse({ dateFrom: '2026-10-30', dateTo: '2026-10-24' }).invalid,
    ).toEqual(['dateTo']);
    expect(
      parse({ dateFrom: '2026-10-24', dateTo: '2026-10-24' }).invalid,
    ).toEqual([]);
    expect(parse({ dateTo: '2026-10-24' }).invalid).toEqual([]);
  });

  it('rejects empty ids instead of silently matching nothing', () => {
    expect(parse({ localityId: '' }).invalid).toEqual(['localityId']);
    expect(parse({ activityId: '' }).invalid).toEqual(['activityId']);
    expect(parse({ categoryId: ['c1', ''] }).invalid).toEqual(['categoryId']);
  });

  it('accepts calendar days and rejects times and impossible dates', () => {
    expect(
      parse({ dateFrom: '2026-10-24', dateTo: '2026-10-25' }).invalid,
    ).toEqual([]);
    expect(parse({ dateFrom: '2026-10-24T10:00:00Z' }).invalid).toEqual([
      'dateFrom',
    ]);
    expect(parse({ dateTo: '2026-02-30' }).invalid).toEqual(['dateTo']);
    expect(parse({ dateTo: '24. 10. 2026' }).invalid).toEqual(['dateTo']);
  });
});
