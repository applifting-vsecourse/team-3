import { UserRepository } from '@/modules/user/repositories/user.repository';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { UserService } from './user.service';

describe('public profile availability (#179)', () => {
  it('returns the same unavailable result for missing, blocked or deleted profiles before querying private history', async () => {
    const repository = mock<UserRepository>();
    repository.getPublicUser.mockResolvedValue(null);
    await expect(
      new UserService(repository).getPublicProfile('unavailable'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.details).not.toHaveBeenCalled();
  });
});
