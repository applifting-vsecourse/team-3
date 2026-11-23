import { PrismaModule } from '@/core/prisma/prisma.module';
import { EventModule } from '@/modules/event/event.module';
import { GroupModule } from '@/modules/group/group.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AccountController } from './controllers/account.controller';
import { AccountRepository } from './repositories/account.repository';
import { AccountService } from './services/account.service';

@Module({
  // EventModule: cancelling the events as „Zrušit akci“ does; GroupModule:
  // deactivating the groups run alone; NotificationModule: „participant-left“
  imports: [
    PrismaModule,
    AuthModule,
    EventModule,
    GroupModule,
    NotificationModule,
  ],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
})
export class AccountModule {}
