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

  it('the activity and the way of joining cannot be changed', () => {
    expect(
      invalid({ activityId: 'a1', approvalMode: 'approval' }).sort(),
    ).toEqual(['activityId', 'approvalMode']);
  });

  it('nor the organizer', () => {
    expect(invalid({ organizerUserId: 'someone-else' })).toEqual([
      'organizerUserId',
    ]);
  });

  it('keeps the same field rules as creating: min ≥ 1, numbers for coordinates, a non-empty title', () => {
    expect(invalid({ minParticipants: 0 })).toEqual(['minParticipants']);
    expect(invalid({ lat: '50.1' })).toEqual(['lat']);
    expect(invalid({ title: '  ' })).toEqual(['title']);
  });
});
