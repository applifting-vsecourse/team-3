import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DecideRequestsDto } from './decide-requests.dto';

const invalid = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(DecideRequestsDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('DecideRequestsDto', () => {
  it('takes one or more user ids', () => {
    expect(invalid({ userIds: ['u2'] })).toEqual([]);
    expect(invalid({ userIds: ['u2', 'u3'] })).toEqual([]);
  });

  it('refuses no ids, a duplicate, an empty id or something else than a list', () => {
    expect(invalid({ userIds: [] })).toEqual(['userIds']);
    expect(invalid({ userIds: ['u2', 'u2'] })).toEqual(['userIds']);
    expect(invalid({ userIds: [''] })).toEqual(['userIds']);
    expect(invalid({ userIds: 'u2' })).toEqual(['userIds']);
    expect(invalid({})).toEqual(['userIds']);
  });
});
