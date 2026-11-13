import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { MyEventRatingResponseDto, RateEventDto } from './event-rating.dto';

// Same transform the controller's ValidationPipe runs on the raw body.
const parse = (
  body: Record<string, unknown>,
): { dto: RateEventDto; invalid: string[]; messages: string[] } => {
  const dto = plainToInstance(RateEventDto, body);
  const errors = validateSync(dto, { whitelist: true });
  return {
    dto,
    invalid: errors.map((error) => error.property).sort(),
    messages: errors.flatMap((error) => Object.values(error.constraints ?? {})),
  };
};

describe('RateEventDto (#66)', () => {
  it('takes both stars and an optional comment, trimmed', () => {
    const { dto, invalid } = parse({
      eventStars: 5,
      organizerStars: 1,
      comment: '  Skvělá parta \n',
    });
    expect(invalid).toEqual([]);
    expect(dto.comment).toBe('Skvělá parta');
    expect(parse({ eventStars: 3, organizerStars: 3 }).invalid).toEqual([]);
  });

  it('a blank comment is none', () => {
    expect(
      parse({ eventStars: 3, organizerStars: 3, comment: '  ' }).dto.comment,
    ).toBeNull();
    expect(
      parse({ eventStars: 3, organizerStars: 3, comment: null }).invalid,
    ).toEqual([]);
  });

  it('requires whole stars from 1 to 5, in Czech', () => {
    expect(parse({}).invalid).toEqual(['eventStars', 'organizerStars']);
    for (const stars of [0, 6, 4.5, '5']) {
      expect(
        parse({ eventStars: stars, organizerStars: stars }).invalid,
      ).toEqual(['eventStars', 'organizerStars']);
    }
    expect(parse({ eventStars: 0, organizerStars: 5 }).messages).toContain(
      'Vyber 1 až 5 hvězdiček',
    );
  });

  it('refuses a comment over 500 characters, or one that is not text', () => {
    expect(
      parse({ eventStars: 3, organizerStars: 3, comment: 'a'.repeat(501) })
        .invalid,
    ).toEqual(['comment']);
    expect(
      parse({ eventStars: 3, organizerStars: 3, comment: 'a'.repeat(500) })
        .invalid,
    ).toEqual([]);
    expect(
      parse({ eventStars: 3, organizerStars: 3, comment: 5 }).invalid,
    ).toEqual(['comment']);
  });
});

describe('MyEventRatingResponseDto', () => {
  it('returns only what the participant sees of their rating', () => {
    const updatedAt = new Date('2026-11-01T08:00:00.000Z');
    const ratableUntil = new Date('2026-11-14T19:00:00.000Z');
    expect(
      MyEventRatingResponseDto.fromDomain({
        rating: {
          eventStars: 5,
          organizerStars: 4,
          comment: null,
          updatedAt,
          // anything else the domain might carry stays out
          ...({ deletedAt: null } as object),
        },
        ratableUntil,
        refusal: null,
      }),
    ).toEqual({
      rating: { eventStars: 5, organizerStars: 4, comment: null, updatedAt },
      ratableUntil,
      refusal: null,
    });
  });
});
