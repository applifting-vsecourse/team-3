import {
  moderationReason,
  ReasonRefusal,
} from '@/modules/admin/domain/event-moderation';
import {
  decideBlock,
  decideUnblock,
  UserModerationDecision,
  UserModerationRefusal,
} from '@/modules/admin/domain/user-moderation';
import {
  AdminOverview,
  UserModerationRepository,
} from '@/modules/admin/repositories/user-moderation.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const REFUSAL_MESSAGES: Record<UserModerationRefusal, string> = {
  CANNOT_BLOCK_SELF: 'Sám sebe zablokovat nejde.',
  CANNOT_BLOCK_ADMIN: 'Správce HobbyHubu zablokovat nejde.',
  USER_ALREADY_BLOCKED: 'Uživatel už je zablokovaný.',
  USER_NOT_BLOCKED: 'Uživatel není zablokovaný.',
};

const REASON_MESSAGES: Record<ReasonRefusal, string> = {
  REASON_REQUIRED: 'Napiš důvod zablokování.',
  REASON_TOO_LONG: 'Důvod může mít nejvýš 500 znaků.',
};

const answer = (decision: UserModerationDecision | null): void => {
  if (!decision) throw new NotFoundException('Uživatel neexistuje.');
  if (!decision.ok) {
    throw new ConflictException({
      code: decision.refusal,
      message: REFUSAL_MESSAGES[decision.refusal],
    });
  }
};

/**
 * The superadmin blocks and unblocks users and sees what is deactivated or blocked
 * (PO 26. 11., B-063). Blocking is written to the history (`block_user`) with its reason;
 * unblocking marks that row as reverted.
 */
@Injectable()
export class UserModerationService {
  constructor(private readonly repository: UserModerationRepository) {}

  async blockUser(
    userId: string,
    adminId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<void> {
    const checked = moderationReason(reason);
    if (!checked.ok) {
      throw new BadRequestException({
        code: checked.refusal,
        message: REASON_MESSAGES[checked.refusal],
      });
    }
    answer(
      await this.repository.blockUser(
        userId,
        adminId,
        checked.reason,
        now,
        decideBlock,
      ),
    );
  }

  async unblockUser(
    userId: string,
    adminId: string,
    now: Date = new Date(),
  ): Promise<void> {
    answer(
      await this.repository.unblockUser(userId, adminId, now, decideUnblock),
    );
  }

  overview(): Promise<AdminOverview> {
    return this.repository.overview();
  }
}
