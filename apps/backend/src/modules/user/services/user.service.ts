import type { PublicEvent } from '@/modules/event/domain/event';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  publicProfile,
  type PublicUserProfile,
} from '@/modules/user/domain/public-profile';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** The public profile as its viewer sees it (#179, #307). */
export type PublicUserView = PublicUserProfile & {
  /** How the viewer stands to the person; null for a visitor. */
  friendship: FriendshipState | null;
  /** „Kam jde“, for a friend only; null for anyone else. */
  upcomingEvents: PublicEvent[] | null;
};

@Injectable()
export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly friendships: FriendshipService,
  ) {}

  async getPublicProfile(
    userId: string,
    viewerId: string | null = null,
  ): Promise<PublicUserView> {
    const user = await this.repository.getPublicUser(userId);
    if (!user) throw new NotFoundException('Profil není dostupný.');
    const now = new Date();
    const [details, friendship] = await Promise.all([
      this.repository.details(userId, now),
      viewerId ? this.friendships.state(viewerId, userId) : null,
    ]);
    // „Kam jde“ is asked for only once friendship is known: nobody else's query sees the events
    const upcomingEvents =
      viewerId && friendship === 'friends'
        ? await this.repository.friendUpcomingEvents(userId, viewerId, now)
        : null;
    return {
      ...publicProfile(
        user,
        details.received,
        details.personal,
        details.events,
        now,
      ),
      friendship,
      upcomingEvents,
    };
  }
}
