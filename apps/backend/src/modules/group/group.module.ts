import { PrismaModule } from '@/core/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { GroupsController } from './controllers/groups.controller';
import { MyGroupsController } from './controllers/my-groups.controller';
import { GroupRepository } from './repositories/group.repository';
import { GroupsService } from './services/groups.service';

@Module({
  // NotificationModule: the announcement e-mail to the members (#194)
  imports: [PrismaModule, AuthModule, NotificationModule],
  controllers: [GroupsController, MyGroupsController],
  providers: [GroupsService, GroupRepository],
  exports: [GroupsService, GroupRepository],
})
export class GroupModule {}
