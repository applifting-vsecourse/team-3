import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

const valid = {
  title: 'Deskovky po práci',
  activityId: 'a-deskove-hry',
  localityId: 'l-praha-8',
  lat: 50.0928,
  lng: 14.4508,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  startsAt: '2026-11-02T17:00:00.000Z',
  minParticipants: 3,
  maxParticipants: 6,
  approvalMode: 'open',
};

// Same as the controller's ValidationPipe: whitelist + forbidNonWhitelisted.
const invalid = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(CreateEventDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('CreateEventDto', () => {
  it('accepts a complete event; the description and the end are optional', () => {
    expect(invalid(valid)).toEqual([]);
  });

  it('requires the title, activity, locality, place, address, start, limits and approval mode', () => {
    expect(invalid({}).sort()).toEqual(
      [
        'activityId',
        'address',
        'approvalMode',
        'lat',
        'lng',
        'localityId',
        'maxParticipants',
        'minParticipants',
        'startsAt',
        'title',
      ].sort(),
    );
    expect(invalid({ ...valid, title: '   ' })).toEqual(['title']);
  });

  it('min 0 is invalid; the minimum is at least 1', () => {
    expect(invalid({ ...valid, minParticipants: 0 })).toEqual([
      'minParticipants',
    ]);
  });

  it('max below min is invalid; max equal to min is fine', () => {
    expect(
      invalid({ ...valid, minParticipants: 6, maxParticipants: 5 }),
    ).toEqual(['maxParticipants']);
    expect(
      invalid({ ...valid, minParticipants: 6, maxParticipants: 6 }),
    ).toEqual([]);
  });

  it("a start or end that ISO 8601 allows but a Date can't read is invalid, not a 500", () => {
    // a week date and a decimal comma passed IsDateString and broke the insert
    expect(invalid({ ...valid, startsAt: '2027-W10-3' })).toEqual(['startsAt']);
    expect(invalid({ ...valid, startsAt: '2027-03-10T18:00:00,5Z' })).toEqual([
      'startsAt',
    ]);
    expect(invalid({ ...valid, endsAt: '2026-11-02T19:00:00,5Z' })).toEqual([
      'endsAt',
    ]);
    // basic format and an ordinal date: ISO 8601, but not for a Date
    expect(invalid({ ...valid, startsAt: '20270310T180000Z' })).toEqual([
      'startsAt',
    ]);
    expect(invalid({ ...valid, startsAt: '2027-069' })).toEqual(['startsAt']);
    // what the app sends (toISOString) and a plain offset are fine
    expect(
      invalid({ ...valid, startsAt: '2026-11-02T18:00:00+01:00' }),
    ).toEqual([]);
  });

  it('an end that is no date gets the date error only, not „must be after startsAt“', () => {
    // what staging answered before: both, though the order wasn't the problem
    const errors = validateSync(
      plainToInstance(CreateEventDto, { ...valid, endsAt: 'zítra večer' }),
      { whitelist: true, forbidNonWhitelisted: true },
    );

    expect(errors.map((error) => error.property)).toEqual(['endsAt']);
    expect(Object.keys(errors[0]?.constraints ?? {})).not.toContain(
      'endsAfterStart',
    );
  });

  it('a date that is the year 10000 in UTC is invalid: it could not be read back', () => {
    expect(
      invalid({ ...valid, startsAt: '9999-12-31T23:30:00-01:00' }),
    ).toEqual(['startsAt']);
    expect(invalid({ ...valid, startsAt: '9999-12-31T22:00:00Z' })).toEqual([]);
  });

  it('an end before the start is invalid', () => {
    expect(invalid({ ...valid, endsAt: '2026-11-02T16:00:00.000Z' })).toEqual([
      'endsAt',
    ]);
  });

  it('the organizer cannot be sent in the body', () => {
    expect(invalid({ ...valid, organizerUserId: 'someone-else' })).toEqual([
      'organizerUserId',
    ]);
  });

  it('coordinates must be numbers, not numeric strings', () => {
    expect(invalid({ ...valid, lat: '50.09', lng: '14.45' }).sort()).toEqual([
      'lat',
      'lng',
    ]);
  });

  it('only the two approval modes', () => {
    expect(invalid({ ...valid, approvalMode: 'invite' })).toEqual([
      'approvalMode',
    ]);
  });
});
