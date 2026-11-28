import { MailModule } from '@/core/email/mail.module';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { EventReminderRepository } from './repositories/event-reminder.repository';
import { NotificationCenterRepository } from './repositories/notification-center.repository';
import { NotificationRepository } from './repositories/notification.repository';
import { RatingInvitationRepository } from './repositories/rating-invitation.repository';
import { EventReminderService } from './services/event-reminder.service';
import { NotificationCenterService } from './services/notification-center.service';
import { NotificationService } from './services/notification.service';
import { RatingInvitationService } from './services/rating-invitation.service';

/**
 * E-mails about events (#177) and the centre of upozornění (#86). Import it
 * and inject `NotificationService`; `notify(...)` is all a service calls.
 */
@Module({
  // MailModule: the shared `EmailService`, the same transport as the account e-mails
  // AuthModule: the session guards of the centre's API
  imports: [PrismaModule, MailModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationCenterService,
    NotificationCenterRepository,
    NotificationService,
    NotificationRepository,
    RatingInvitationService,
    RatingInvitationRepository,
    EventReminderService,
    EventReminderRepository,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
