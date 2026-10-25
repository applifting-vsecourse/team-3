import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { GroupsController } from './controllers/groups.controller';
import { MyGroupsController } from './controllers/my-groups.controller';
import { GroupRepository } from './repositories/group.repository';
import { GroupsService } from './services/groups.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GroupsController, MyGroupsController],
  providers: [GroupsService, GroupRepository],
  exports: [GroupsService],
})
export class GroupModule {}
