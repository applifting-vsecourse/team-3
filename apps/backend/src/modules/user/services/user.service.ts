import type { PublicEvent } from '@/modules/event/domain/event';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  canSee,
  needsOrganizerCheck,
  type ProfileViewer,
} from '@/modules/user/domain/profile-visibility';
import {
  publicProfile,
  visibleDetails,
  type PublicUserProfile,
  type PublicUserRecord,
  type VisibleDetails,
} from '@/modules/user/domain/public-profile';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** The public profile as its viewer sees it (#179, #307). */
export type PublicUserView = PublicUserProfile &
  VisibleDetails & {
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
    const viewer = await this.viewer(user, viewerId, friendship);
    // „Kam jde“ is asked for only once friendship is known: nobody else's query sees the events
    const [upcomingEvents, attended] = await Promise.all([
      viewerId && friendship === 'friends'
        ? this.repository.friendUpcomingEvents(userId, viewerId, now)
        : null,
      // visited events (#64) are loaded only for whom the person shows them
      canSee(user.pastEventsVisibility, viewer)
        ? this.repository.attendedEvents(userId, now)
        : null,
    ]);
    return {
      ...publicProfile(
        user,
        details.received,
        details.personal,
        details.events,
        now,
      ),
      ...visibleDetails(user, viewer, attended, now),
      friendship,
      upcomingEvents,
    };
  }

  /** How the viewer stands to the person (B-014, #64); the organizer check only when it matters. */
  private async viewer(
    user: PublicUserRecord,
    viewerId: string | null,
    friendship: FriendshipState | null,
  ): Promise<ProfileViewer> {
    const known = {
      isSelf: viewerId === user.id,
      isFriend: friendship === 'friends',
    };
    const visibilities = [
      user.photoVisibility,
      user.bioVisibility,
      user.pastEventsVisibility,
    ];
    const isOrganizer =
      viewerId !== null &&
      needsOrganizerCheck(visibilities, known) &&
      (await this.repository.isOrganizerFor(viewerId, user.id));
    return { ...known, isOrganizer };
  }
}
