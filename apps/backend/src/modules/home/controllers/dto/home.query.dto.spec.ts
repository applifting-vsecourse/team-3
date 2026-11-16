import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { HomeQueryDto } from './home.query.dto';

const parse = (
  query: Record<string, unknown>,
): { dto: HomeQueryDto; invalid: string[] } => {
  const dto = plainToInstance(HomeQueryDto, query);
  return {
    dto,
    invalid: validateSync(dto, { whitelist: true }).map((e) => e.property),
  };
};

describe('HomeQueryDto', () => {
  it('reads wholeCountry as a boolean (#299)', () => {
    expect(parse({ wholeCountry: 'true' })).toEqual({
      dto: expect.objectContaining({ wholeCountry: true }) as HomeQueryDto,
      invalid: [],
    });
    expect(parse({ wholeCountry: 'false' }).dto.wholeCountry).toBe(false);
  });

  it('refuses anything else than true or false', () => {
    expect(parse({ wholeCountry: 'yes' }).invalid).toEqual(['wholeCountry']);
  });
});
