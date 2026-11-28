import { ExpiredRequestRepository } from '@/modules/notification/repositories/expired-request.repository';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

/**
 * A request the organizer didn't decide before the event started can't be
 * decided any more (`EVENT_STARTED`), and it drops out of both the upcoming
 * and the past events (#465). Its applicant hears so, once: an upozornění
 * and an e-mail like a decided request's.
 */
@Injectable()
export class ExpiredRequestService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExpiredRequestService.name);
  private running = false;

  constructor(
    private readonly repository: ExpiredRequestRepository,
    private readonly notifications: NotificationService,
  ) {}

  onApplicationBootstrap(): void {
    // Catch up after a restart without delaying application startup.
    void this.run();
  }

  @Cron('0 */15 * * * *', {
    name: 'expired-requests',
    timeZone: 'Europe/Prague',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    // Also covers overlap with the startup run.
    if (this.running) return;
    this.running = true;
    try {
      for (const { eventId, userIds } of await this.repository.findDue(
        new Date(),
      )) {
        // awaited: the upozornění is written before the next tick looks for it
        await this.notifications.deliver({
          type: 'request-decided',
          eventId,
          userIds,
          outcome: 'expired',
        });
      }
    } catch {
      this.logger.warn('Expired requests batch failed; retry on the next tick');
    } finally {
      this.running = false;
    }
  }
}
