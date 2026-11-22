import { PrismaModule } from '@/core/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { FriendsController } from './controllers/friends.controller';
import { InvitesController } from './controllers/invites.controller';
import { FriendshipRepository } from './repositories/friendship.repository';
import { InviteRepository } from './repositories/invite.repository';
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
    InviteService,
    InviteRepository,
  ],
  // the public profile reads how its viewer stands to the person (#307)
  exports: [FriendshipService],
})
export class FriendshipModule {}
