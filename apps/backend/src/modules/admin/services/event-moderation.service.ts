import {
  decideHide,
  decideUnhide,
  ModerationDecision,
  moderationReason,
  ModerationRefusal,
  ReasonRefusal,
} from '@/modules/admin/domain/event-moderation';
import { EventModerationRepository } from '@/modules/admin/repositories/event-moderation.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const REFUSAL_MESSAGES: Record<ModerationRefusal, string> = {
  EVENT_CANCELLED: 'Zrušenou akci deaktivovat nejde.',
  EVENT_ALREADY_HIDDEN: 'Akce už je deaktivovaná.',
  EVENT_NOT_HIDDEN: 'Akce není deaktivovaná.',
};

const REASON_MESSAGES: Record<ReasonRefusal, string> = {
  REASON_REQUIRED: 'Napiš důvod deaktivace.',
  REASON_TOO_LONG: 'Důvod může mít nejvýš 500 znaků.',
};

const answer = (decision: ModerationDecision | null): void => {
  if (!decision) throw new NotFoundException('Akce neexistuje.');
  if (!decision.ok) {
    throw new ConflictException({
      code: decision.refusal,
      message: REFUSAL_MESSAGES[decision.refusal],
    });
  }
};

/**
 * The superadmin deactivates an event and restores it (#308, B-063).
 * Deactivating is not cancelling: the event leaves every list, its detail
 * is 404 for everyone but the superadmin, nobody gets an e-mail, and it can
 * be restored. Only deactivating is written to the history (`hide_event`);
 * restoring marks that row as reverted.
 */
@Injectable()
export class EventModerationService {
  constructor(private readonly repository: EventModerationRepository) {}

  async hideEvent(
    eventId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    // trimmed and checked here too (review #380): a blank reason never reaches the history
    const checked = moderationReason(reason);
    if (!checked.ok) {
      throw new BadRequestException({
        code: checked.refusal,
        message: REASON_MESSAGES[checked.refusal],
      });
    }
    answer(
      await this.repository.hideEvent(
        eventId,
        adminId,
        checked.reason,
        decideHide,
      ),
    );
  }

  async unhideEvent(
    eventId: string,
    adminId: string,
    now: Date = new Date(),
  ): Promise<void> {
    answer(
      await this.repository.unhideEvent(eventId, adminId, now, decideUnhide),
    );
  }
}
