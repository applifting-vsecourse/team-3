import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { HIDE_REASON_MAX_LENGTH, HideEventDto } from './hide-event.dto';

const invalid = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(HideEventDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('HideEventDto (#308)', () => {
  it('requires a reason; blanks are not one', () => {
    expect(invalid({})).toEqual(['reason']);
    expect(invalid({ reason: '   ' })).toEqual(['reason']);
    expect(invalid({ reason: 'Podvodná akce.' })).toEqual([]);
  });

  it(`a reason has at most ${HIDE_REASON_MAX_LENGTH} characters`, () => {
    expect(invalid({ reason: 'x'.repeat(HIDE_REASON_MAX_LENGTH + 1) })).toEqual(
      ['reason'],
    );
  });
});
