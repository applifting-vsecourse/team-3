import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import {
  composeRatingInvitation,
  RatingInvitation,
  ratingInvitationKey,
  ratingInvitations,
} from '@/modules/notification/domain/rating-invitation';
import { RatingInvitationRepository } from '@/modules/notification/repositories/rating-invitation.repository';
import { Config } from '@/shared/config/config.service';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RatingInvitationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RatingInvitationService.name);
  private running = false;

  constructor(
    private readonly repository: RatingInvitationRepository,
    @Inject('EmailService') private readonly email: EmailService,
    private readonly config: Config,
  ) {}

  onApplicationBootstrap(): void {
    // Recover a missed evening without delaying application startup.
    void this.run();
  }

  /** New invitations become due once daily at 21:00 Prague. The intervening
   * ticks only recover missed/failed delivery, not events from a new batch. */
  @Cron('0 */15 * * * *', {
    name: 'rating-invitations',
    timeZone: 'Europe/Prague',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    // Also covers overlap with the startup recovery.
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      let after: string | undefined;
      for (;;) {
        const events = await this.repository.findEventIds(now, after);
        if (events.length === 0) break;
        for (const { id } of events) {
          try {
            const event = await this.repository.findEvent(id);
            if (!event) continue;
            for (const invitation of ratingInvitations(event, new Date())) {
              await this.deliver(id, invitation);
            }
          } catch {
            // Provider/DB error messages can contain addresses and credentials.
            this.logger.warn(
              `Rating invitation preparation failed: event ${id}`,
            );
          }
        }
        after = events[events.length - 1].id;
      }
    } catch {
      this.logger.warn(
        'Rating invitation batch failed; retry on the next tick',
      );
    } finally {
      this.running = false;
    }
  }

  private async deliver(
    eventId: string,
    invitation: RatingInvitation,
  ): Promise<void> {
    const key = ratingInvitationKey(eventId, invitation);
    let claimToken: string | null = null;
    let accepted = false;
    try {
      claimToken = await this.repository.claim(eventId, invitation, new Date());
      if (!claimToken) return;
      // A cancellation, changed participation or blocked user during the batch
      // must not use the stale recipient list, address or rating deadline.
      const event = await this.repository.findEvent(eventId);
      const current =
        event &&
        ratingInvitations(event, new Date()).find(
          (target) =>
            target.role === invitation.role &&
            target.userId === invitation.userId,
        );
      if (!event || !current) {
        await this.repository.release(key, claimToken);
        return;
      }
      const message = composeRatingInvitation(
        event,
        current.role,
        this.config.frontendUrl,
      );
      const html = await renderEmail(EventNotificationEmail, message.email);
      await this.email.sendEmail(current.email, message.subject, html);
      accepted = true;
      await this.repository.markSent(key, claimToken, new Date());
    } catch {
      this.logger.warn(
        `Rating invitation delivery failed: event ${eventId}, user ${invitation.userId}`,
      );
      // After provider acceptance keep the claim if persisting failed. Retrying
      // that ambiguous case immediately would risk a duplicate.
      if (claimToken && !accepted) {
        try {
          await this.repository.release(key, claimToken);
        } catch {
          this.logger.warn(
            `Rating invitation claim release failed: event ${eventId}`,
          );
        }
      }
    }
  }
}
