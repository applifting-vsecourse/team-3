import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { FriendsController } from './controllers/friends.controller';
import { FriendshipRepository } from './repositories/friendship.repository';
import { FriendshipService } from './services/friendship.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FriendsController],
  providers: [FriendshipService, FriendshipRepository],
  // the public profile reads how its viewer stands to the person (#307)
  exports: [FriendshipService],
})
export class FriendshipModule {}
