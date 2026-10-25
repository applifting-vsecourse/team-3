import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateEventDto } from './update-event.dto';

const invalid = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(UpdateEventDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe('UpdateEventDto', () => {
  it('every editable field is optional', () => {
    expect(invalid({})).toEqual([]);
    expect(invalid({ title: 'Nový název', maxParticipants: 8 })).toEqual([]);
  });

  it('the end is a date-time, and null clears it', () => {
    expect(invalid({ endsAt: '2026-11-02T20:00:00.000Z' })).toEqual([]);
    expect(invalid({ endsAt: null })).toEqual([]);
    expect(invalid({ endsAt: 'zítra' })).toEqual(['endsAt']);
  });

  it('the activity and the way of joining cannot be changed', () => {
    expect(
      invalid({ activityId: 'a1', approvalMode: 'approval' }).sort(),
    ).toEqual(['activityId', 'approvalMode']);
  });

  it("a start a Date can't read (an ISO week date) is a 400, not a 500", () => {
    expect(invalid({ startsAt: '2027-W10-3' })).toEqual(['startsAt']);
    expect(invalid({ startsAt: '2026-11-02T17:00:00.000Z' })).toEqual([]);
  });

  it('nor the organizer', () => {
    expect(invalid({ organizerUserId: 'someone-else' })).toEqual([
      'organizerUserId',
    ]);
  });

  it('keeps the same field rules as creating: min ≥ 1, numbers for coordinates, a non-empty title', () => {
    expect(invalid({ minParticipants: 0 })).toEqual(['minParticipants']);
    expect(invalid({ lat: '50.1', lng: 14.45 })).toEqual(['lat']);
    expect(invalid({ title: '  ' })).toEqual(['title']);
  });

  it('null is a 400 for fields that must have a value; the description may be cleared', () => {
    expect(
      invalid({
        title: null,
        localityId: null,
        address: null,
        startsAt: null,
        minParticipants: null,
        maxParticipants: null,
      }).sort(),
    ).toEqual([
      'address',
      'localityId',
      'maxParticipants',
      'minParticipants',
      'startsAt',
      'title',
    ]);
    expect(invalid({ description: null })).toEqual([]);
  });

  it('the place moves with both coordinates or not at all', () => {
    expect(invalid({ lat: 50.1 })).toEqual(['lng']);
    expect(invalid({ lng: 14.45 })).toEqual(['lat']);
    expect(invalid({ lat: null, lng: null }).sort()).toEqual(['lat', 'lng']);
    expect(invalid({ lat: 50.1, lng: 14.45 })).toEqual([]);
  });
});
