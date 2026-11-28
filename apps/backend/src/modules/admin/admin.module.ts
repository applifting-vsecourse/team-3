import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AdminEventsController } from './controllers/admin-events.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { EventModerationRepository } from './repositories/event-moderation.repository';
import { UserModerationRepository } from './repositories/user-moderation.repository';
import { EventModerationService } from './services/event-moderation.service';
import { UserModerationService } from './services/user-moderation.service';

/**
 * The superadmin's first cut (#308, part of B-063 without the report queue
 * of B-062): deactivating and restoring events. `/api/admin/*`, all behind
 * `AdminGuard`.
 */
@Module({
  // AuthModule and PrismaModule: AdminGuard reads the session and the role
  imports: [PrismaModule, AuthModule],
  controllers: [AdminEventsController, AdminUsersController],
  providers: [
    EventModerationService,
    EventModerationRepository,
    UserModerationService,
    UserModerationRepository,
  ],
})
export class AdminModule {}
