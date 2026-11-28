import { UserModerationRepository } from '@/modules/admin/repositories/user-moderation.repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserModerationService } from './user-moderation.service';

const now = new Date('2026-11-27T10:00:00.000Z');

describe('UserModerationService (PO 26. 11.)', () => {
  let repository: MockProxy<UserModerationRepository>;
  let service: UserModerationService;

  beforeEach(() => {
    repository = mock<UserModerationRepository>();
    service = new UserModerationService(repository);
  });

  it('blocks with the trimmed reason, decided under the lock', async () => {
    repository.blockUser.mockResolvedValue({ ok: true });

    await service.blockUser('u2', 'admin', '  spam  ', now);

    expect(repository.blockUser).toHaveBeenCalledWith(
      'u2',
      'admin',
      'spam',
      now,
      expect.any(Function),
    );
  });

  it('a blank reason never reaches the repository', async () => {
    await expect(
      service.blockUser('u2', 'admin', '   ', now),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.blockUser).not.toHaveBeenCalled();
  });

  it('an unknown user is 404, a refusal 409 with its code', async () => {
    repository.blockUser.mockResolvedValueOnce(null);
    await expect(
      service.blockUser('nobody', 'admin', 'spam', now),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.blockUser.mockResolvedValueOnce({
      ok: false,
      refusal: 'CANNOT_BLOCK_ADMIN',
    });
    const refusal = service.blockUser('a2', 'admin', 'spam', now);
    await expect(refusal).rejects.toBeInstanceOf(ConflictException);
    await expect(refusal).rejects.toMatchObject({
      response: {
        code: 'CANNOT_BLOCK_ADMIN',
        message: 'Správce HobbyHubu zablokovat nejde.',
      },
    });
  });

  it('unblocks', async () => {
    repository.unblockUser.mockResolvedValue({ ok: true });

    await service.unblockUser('u2', 'admin', now);

    expect(repository.unblockUser).toHaveBeenCalledWith(
      'u2',
      'admin',
      now,
      expect.any(Function),
    );
  });
});
