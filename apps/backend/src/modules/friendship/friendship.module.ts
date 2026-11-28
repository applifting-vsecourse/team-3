import { PrismaModule } from '@/core/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { FriendsController } from './controllers/friends.controller';
import { InviteLookupThrottlerGuard } from './controllers/invite-lookup-throttler.guard';
import { InvitesController } from './controllers/invites.controller';
import { FriendshipRepository } from './repositories/friendship.repository';
import { InviteRepository } from './repositories/invite.repository';
import { FriendRequestLimitRepository } from './repositories/request-limit.repository';
import { FriendshipService } from './services/friendship.service';
import { InviteService } from './services/invite.service';

@Module({
  // NotificationModule: a request and an acceptance tell the other (#86)
  imports: [PrismaModule, AuthModule, NotificationModule],
  // InvitesController: Pozvánka od kamaráda (#406), friends straight from an invite link
  controllers: [FriendsController, InvitesController],
  providers: [
    FriendshipService,
    FriendshipRepository,
    FriendRequestLimitRepository,
    InviteService,
    InviteRepository,
    // one counter for the public lookup of invite codes (#406)
    InviteLookupThrottlerGuard,
  ],
  // the public profile reads how its viewer stands to the person (#307)
  exports: [FriendshipService],
})
export class FriendshipModule {}
