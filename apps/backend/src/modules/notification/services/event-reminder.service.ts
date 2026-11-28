import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import {
  composeOrganizerOverview,
  composeParticipantReminder,
  EventReminder,
  eventReminderKey,
  eventReminders,
  ReminderEvent,
} from '@/modules/notification/domain/event-reminder';
import { EventReminderRepository } from '@/modules/notification/repositories/event-reminder.repository';
import { Config } from '@/shared/config/config.service';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

/**
 * Reminders before an event (#405, B-043): the participants' a day before,
 * the organizer's overview 48 and 24 hours before while short of the
 * minimum. Same scheduler, send log and retries as the rating invitations.
 */
@Injectable()
export class EventReminderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventReminderService.name);
  private running = false;

  constructor(
    private readonly repository: EventReminderRepository,
    @Inject('EmailService') private readonly email: EmailService,
    private readonly config: Config,
  ) {}

  onApplicationBootstrap(): void {
    // Catch up after a restart without delaying application startup.
    void this.run();
  }

  @Cron('0 */15 * * * *', {
    name: 'event-reminders',
    timeZone: 'Europe/Prague',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    // Also covers overlap with the startup run.
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
            const reminders = eventReminders(event, now);
            if (!reminders.length) continue;
            const unavailable = await this.repository.findUnavailableKeys(
              id,
              now,
            );
            for (const reminder of reminders) {
              if (!unavailable.has(eventReminderKey(event, reminder))) {
                await this.deliver(event, reminder);
              }
            }
          } catch {
            // Provider/DB error messages can contain addresses and credentials.
            this.logger.warn(`Event reminder preparation failed: event ${id}`);
          }
        }
        after = events[events.length - 1].id;
      }
    } catch {
      this.logger.warn('Event reminder batch failed; retry on the next tick');
    } finally {
      this.running = false;
    }
  }

  private async deliver(
    planned: ReminderEvent,
    reminder: EventReminder,
  ): Promise<void> {
    const key = eventReminderKey(planned, reminder);
    let claimToken: string | null = null;
    let accepted = false;
    try {
      claimToken = await this.repository.claim(planned, reminder, new Date());
      if (!claimToken) return;
      // A cancellation, a new date, someone joining (minimum reached) or a
      // blocked user during the batch must not use the stale event.
      const event = await this.repository.findEvent(planned.id);
      const now = new Date();
      const current =
        event &&
        eventReminders(event, now).find(
          (target) => eventReminderKey(event, target) === key,
        );
      if (!event || !current) {
        await this.repository.release(key, claimToken);
        return;
      }
      const message =
        current.kind === 'participant'
          ? composeParticipantReminder(event, now, this.config.frontendUrl)
          : composeOrganizerOverview(
              event,
              now,
              this.config.frontendUrl,
              this.config.toppingEnabled,
            );
      const html = await renderEmail(EventNotificationEmail, message.email);
      await this.email.sendEmail(current.email, message.subject, html);
      accepted = true;
      await this.repository.markSent(key, claimToken, new Date());
    } catch {
      this.logger.warn(
        `Event reminder delivery failed: event ${planned.id}, user ${reminder.userId}`,
      );
      // After provider acceptance keep the claim if persisting failed:
      // retrying that ambiguous case immediately would risk a duplicate.
      if (claimToken && !accepted) {
        try {
          await this.repository.release(key, claimToken);
        } catch {
          this.logger.warn(
            `Event reminder claim release failed: event ${planned.id}`,
          );
        }
      }
    }
  }
}
