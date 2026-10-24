import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CANCEL_REASON_MAX_LENGTH, CancelEventDto } from './cancel-event.dto';

const invalid = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(CancelEventDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('CancelEventDto', () => {
  it('requires a reason; blanks are not one', () => {
    expect(invalid({})).toEqual(['reason']);
    expect(invalid({ reason: '   ' })).toEqual(['reason']);
    expect(invalid({ reason: 'Herna má zavřeno.' })).toEqual([]);
  });

  it(`a reason has at most ${CANCEL_REASON_MAX_LENGTH} characters`, () => {
    expect(
      invalid({ reason: 'x'.repeat(CANCEL_REASON_MAX_LENGTH + 1) }),
    ).toEqual(['reason']);
  });
});
