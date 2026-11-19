import { MailModule } from '@/core/email/mail.module';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { RatingInvitationRepository } from './repositories/rating-invitation.repository';
import { NotificationService } from './services/notification.service';
import { RatingInvitationService } from './services/rating-invitation.service';

/**
 * E-mails about events (#177). Import it and inject `NotificationService`;
 * `notify(...)` is all a service calls.
 */
@Module({
  // MailModule: the shared `EmailService`, the same transport as the account e-mails
  imports: [PrismaModule, MailModule],
  providers: [
    NotificationService,
    NotificationRepository,
    RatingInvitationService,
    RatingInvitationRepository,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
