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
  ])('%s gets the averages and the ratings', async (_who, viewer) => {
    repository.findEventManager.mockResolvedValue(viewer);
    repository.findReceivedRatings.mockResolvedValue(ratings);

    await expect(service.getReceivedRatings('e1', 'u-petra')).resolves.toEqual({
      summary: {
        event: { average: 4.5, count: 2 },
        organizer: { average: 4, count: 2 },
      },
      ratings,
    });
    expect(repository.findEventManager).toHaveBeenCalledWith('e1', 'u-petra');
  });

  it('anyone else is 403 NOT_MANAGER, and no rating is read', async () => {
    repository.findEventManager.mockResolvedValue({
      isOrganizer: false,
      isGroupAdmin: false,
    });

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
    repository.findEventManager.mockResolvedValue(null);

    await expect(
      service.getReceivedRatings('e1', 'u-petra'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
