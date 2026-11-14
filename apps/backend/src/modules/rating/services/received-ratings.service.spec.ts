import { EventViewer } from '@/modules/event/domain/event-viewer';
import { RatingRepository } from '@/modules/rating/repositories/rating.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { RatingService } from './rating.service';

// RatingService: what the event got from its participants (B-060, #66)

const updatedAt = new Date('2026-11-01T08:00:00.000Z');
const ratings = [
  {
    author: { id: 'u-jakub', name: 'Jakub' },
    eventStars: 5,
    organizerStars: 4,
    comment: 'Díky',
    updatedAt,
  },
  {
    author: { id: 'u-lucie', name: 'Lucie' },
    eventStars: 4,
    organizerStars: 4,
    comment: null,
    updatedAt,
  },
];

// a viewer as the event's detail reads it; canManageEvent decides (B-055, review #322)
const viewer = (
  changes: Partial<NonNullable<EventViewer>> = {},
): NonNullable<EventViewer> => ({
  isOrganizer: false,
  participation: null,
  isGroupMember: false,
  isGroupAdmin: false,
  ...changes,
});

describe('RatingService – received ratings (#66)', () => {
  let repository: MockProxy<RatingRepository>;
  let service: RatingService;

  beforeEach(() => {
    repository = mock<RatingRepository>();
    service = new RatingService(repository);
  });

  it.each([
    ['the organizer', { isOrganizer: true, isGroupAdmin: false }],
    ['an admin of its group', { isOrganizer: false, isGroupAdmin: true }],
  ])('%s gets the averages and the ratings', async (_who, roles) => {
    repository.findEventViewer.mockResolvedValue(viewer(roles));
    repository.findReceivedRatings.mockResolvedValue(ratings);

    await expect(service.getReceivedRatings('e1', 'u-petra')).resolves.toEqual({
      summary: {
        event: { average: 4.5, count: 2 },
        organizer: { average: 4, count: 2 },
      },
      ratings,
    });
    expect(repository.findEventViewer).toHaveBeenCalledWith('e1', 'u-petra');
  });

  it.each([
    ['a participant', viewer({ participation: 'approved' as const })],
    ['a member of its group', viewer({ isGroupMember: true })],
  ])('%s is 403 NOT_MANAGER, and no rating is read', async (_who, someone) => {
    repository.findEventViewer.mockResolvedValue(someone);

    const error = await service
      .getReceivedRatings('e1', 'u-jakub')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'NOT_MANAGER',
    });
    expect(repository.findReceivedRatings).not.toHaveBeenCalled();
  });

  it('an unknown, hidden or deleted event is 404', async () => {
    repository.findEventViewer.mockResolvedValue(null);

    await expect(
      service.getReceivedRatings('e1', 'u-petra'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
