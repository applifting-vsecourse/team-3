import {
  decideConfirmation,
  DELETE_CONFIRMATION_PHRASE,
  groupsRunAlone,
  ORGANIZER_DELETED_CANCEL_REASON,
  type DeletionRefusal,
} from '@/modules/account/domain/account-deletion';
import {
  toAccountExport,
  type AccountExport,
} from '@/modules/account/domain/account-export';
import { AccountRepository } from '@/modules/account/repositories/account.repository';
import { EventsService } from '@/modules/event/services/events.service';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import {
  sessionFreshAgeSeconds,
  verifyCurrentPassword,
} from '@/shared/auth/utils/reauthentication';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export type AccountSummary = {
  /** with a password the dialog asks for it, without one for the phrase */
  hasPassword: boolean;
  confirmationPhrase: string;
  /** the groups that will be deactivated unless the person hands them over first */
  groupsRunAlone: { id: string; name: string }[];
  /** the person's events that will be cancelled */
  upcomingOrganizedCount: number;
};

/** Shown at the field in the dialog (the frontend maps the code to it). */
const REFUSALS: Record<
  DeletionRefusal | 'INVALID_PASSWORD',
  () => HttpException
> = {
  PASSWORD_REQUIRED: () =>
    new BadRequestException({
      code: 'PASSWORD_REQUIRED',
      message: 'Napiš svoje heslo.',
    }),
  INVALID_PASSWORD: () =>
    new BadRequestException({
      code: 'INVALID_PASSWORD',
      message: 'Heslo nesedí. Zkus to znovu.',
    }),
  CONFIRMATION_MISMATCH: () =>
    new BadRequestException({
      code: 'CONFIRMATION_MISMATCH',
      message: `Pro potvrzení napiš „${DELETE_CONFIRMATION_PHRASE}“.`,
    }),
  REAUTHENTICATION_REQUIRED: () =>
    new ForbiddenException({
      code: 'REAUTHENTICATION_REQUIRED',
      message:
        'Kvůli bezpečnosti se odhlas a znovu přihlas přes Google. Pak účet smažeš.',
    }),
};

/** „Stáhnout moje data“ and „Smazat účet“ (B-080, #64). */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly repository: AccountRepository,
    private readonly events: EventsService,
    private readonly groups: GroupRepository,
    private readonly notifications: NotificationService,
    @InjectBetterAuth private readonly betterAuth: BetterAuth,
  ) {}

  /** What the deletion dialog says will happen, before anything does. */
  async summary(userId: string, now = new Date()): Promise<AccountSummary> {
    const account = await this.repository.findAccount(userId);
    if (!account) throw new UnauthorizedException();
    const [memberships, upcomingOrganizedCount] = await Promise.all([
      this.repository.findAdminMemberships(userId),
      this.repository.countUpcomingOrganized(userId, now),
    ]);
    return {
      hasPassword: account.hasPassword,
      confirmationPhrase: DELETE_CONFIRMATION_PHRASE,
      groupsRunAlone: groupsRunAlone(memberships),
      upcomingOrganizedCount,
    };
  }

  async export(userId: string, now = new Date()): Promise<AccountExport> {
    const rows = await this.repository.exportRows(userId);
    if (!rows) throw new UnauthorizedException();
    return toAccountExport(userId, rows, now);
  }

  /**
   * Deletes the account (B-080) once the person proved it is them
   * (`decideConfirmation`). In this order, so a failure halfway leaves an
   * account that can try again, never a deleted one with live events:
   * 1. the groups they run alone are deactivated (B-051: their upcoming
   *    events are cancelled, waiting requests removed);
   * 2. their upcoming events are cancelled with a reason, the participants
   *    told as by „Zrušit akci“;
   * 3. the account is anonymized and signed out everywhere, in one
   *    transaction (AccountRepository.deleteAccount);
   * 4. organizers of events they had a place at hear they left.
   */
  async delete(
    userId: string,
    input: { password?: string; confirmation?: string },
    request: Request & { session?: { session?: { createdAt?: unknown } } },
    now = new Date(),
  ): Promise<void> {
    const account = await this.repository.findAccount(userId);
    if (!account) throw new UnauthorizedException();

    const decision = decideConfirmation({
      hasPassword: account.hasPassword,
      password: input.password,
      confirmation: input.confirmation,
      sessionCreatedAt: new Date(
        (request.session?.session?.createdAt as string | Date | undefined) ?? 0,
      ),
      now,
      freshAgeSeconds: account.hasPassword
        ? 0
        : await sessionFreshAgeSeconds(this.betterAuth),
    });
    if (decision.kind === 'refused') throw REFUSALS[decision.refusal]();
    if (
      decision.kind === 'verify-password' &&
      !(await verifyCurrentPassword(
        this.betterAuth,
        request,
        decision.password,
      ))
    ) {
      throw REFUSALS.INVALID_PASSWORD();
    }

    for (const group of groupsRunAlone(
      await this.repository.findAdminMemberships(userId),
    )) {
      await this.groups.deactivateGroup(group.id, now);
    }
    await this.events.cancelOrganizedEvents(
      userId,
      ORGANIZER_DELETED_CANCEL_REASON,
      now,
    );
    const freed = await this.repository.deleteAccount(
      userId,
      account.email,
      now,
    );
    // deleted meanwhile, e.g. in another tab: the session is gone either way
    if (freed === null) throw new UnauthorizedException();
    for (const eventId of freed) {
      try {
        this.notifications.notify({
          type: 'participant-left',
          eventId,
          participantId: userId,
        });
      } catch (error) {
        this.logger.warn(
          `participant-left for event ${eventId} not scheduled: ${error instanceof Error ? error.name : 'unknown error'}`,
        );
      }
    }
  }
}
