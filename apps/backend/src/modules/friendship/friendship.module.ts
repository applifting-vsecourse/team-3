import { PrismaModule } from '@/core/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { FriendsController } from './controllers/friends.controller';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendshipService } from './services/friendship.service';

@Module({
  // NotificationModule: a request and an acceptance tell the other (#86)
  imports: [PrismaModule, AuthModule, NotificationModule],
  controllers: [FriendsController],
  providers: [FriendshipService, FriendshipRepository],
  // the public profile reads how its viewer stands to the person (#307)
  exports: [FriendshipService],
})
export class FriendshipModule {}
