import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { HomeEventsQueryDto } from './home-events.query.dto';

const parse = (
  query: Record<string, unknown>,
): { dto: HomeEventsQueryDto; invalid: string[] } => {
  const dto = plainToInstance(HomeEventsQueryDto, query);
  return {
    dto,
    invalid: validateSync(dto, { whitelist: true }).map((e) => e.property),
  };
};

describe('HomeEventsQueryDto (#250)', () => {
  it('reads the picks as booleans next to the list filters', () => {
    const { dto, invalid } = parse({
      interests: 'true',
      wellRated: 'false',
      capacity: 'missing',
    });
    expect(invalid).toEqual([]);
    expect(dto).toMatchObject({
      interests: true,
      wellRated: false,
      capacity: 'missing',
    });
  });

  it('refuses anything else than true or false', () => {
    expect(parse({ notJoined: 'yes' }).invalid).toEqual(['notJoined']);
  });
});
