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
