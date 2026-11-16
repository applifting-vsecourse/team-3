import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { RateParticipantsDto } from './participant-ratings.dto';

// Same transform the controller's ValidationPipe runs on the raw body.
const parse = (
  body: Record<string, unknown>,
): { dto: RateParticipantsDto; messages: string[] } => {
  const dto = plainToInstance(RateParticipantsDto, body);
  const flatten = (errors: ValidationError[]): string[] =>
    errors.flatMap((error) => [
      ...Object.values(error.constraints ?? {}),
      ...flatten(error.children ?? []),
    ]);
  return {
    dto,
    messages: flatten(validateSync(dto, { whitelist: true })),
  };
};

const item = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  participantId: 'u-jakub',
  stars: 5,
  ...overrides,
});

describe('RateParticipantsDto (#66)', () => {
  it('takes one or more ratings; comments trimmed, blank is none', () => {
    const { dto, messages } = parse({
      ratings: [
        item({ comment: '  Díky za pomoc \n' }),
        item({ participantId: 'u-lucie', stars: 1, comment: '   ' }),
      ],
    });
    expect(messages).toEqual([]);
    expect(dto.ratings.map((rating) => rating.comment)).toEqual([
      'Díky za pomoc',
      null,
    ]);
  });

  it('refuses no ratings, or something else than a list', () => {
    expect(parse({ ratings: [] }).messages).not.toEqual([]);
    expect(parse({}).messages).not.toEqual([]);
    expect(parse({ ratings: item() }).messages).not.toEqual([]);
  });

  it('refuses the same participant twice, in Czech', () => {
    expect(parse({ ratings: [item(), item({ stars: 1 })] }).messages).toContain(
      'Každého účastníka jde v jednom uložení hodnotit jen jednou',
    );
  });

  it('requires whole stars 1–5 and a participant for each', () => {
    for (const stars of [0, 6, 2.5, '5']) {
      expect(parse({ ratings: [item({ stars })] }).messages).toContain(
        'Vyber 1 až 5 hvězdiček',
      );
    }
    expect(
      parse({ ratings: [item({ participantId: '' })] }).messages,
    ).not.toEqual([]);
  });

  it('refuses a comment over 500 characters', () => {
    expect(
      parse({ ratings: [item({ comment: 'a'.repeat(501) })] }).messages,
    ).toContain('Komentář může mít nejvýš 500 znaků');
    expect(
      parse({ ratings: [item({ comment: 'a'.repeat(500) })] }).messages,
    ).toEqual([]);
  });
});
