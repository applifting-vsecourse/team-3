import { startOfPragueDayOf } from '@/modules/event/domain/prague-day';
import {
  friendLists,
  type FriendLists,
} from '@/modules/friendship/domain/friend-list';
import {
  decideReject,
  decideRemove,
  decideRequest,
  friendshipState,
  type FriendshipRefusal,
  type FriendshipState,
} from '@/modules/friendship/domain/friendship';
import { friendRequestsLeft } from '@/modules/friendship/domain/request-limit';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import { FriendRequestLimitRepository } from '@/modules/friendship/repositories/request-limit.repository';
import { NotificationService } from '@/modules/notification/services/notification.service';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const REFUSALS: Record<FriendshipRefusal, () => HttpException> = {
  SELF: () =>
    new BadRequestException({
      code: 'SELF',
      message: 'Sám sebe do přátel nepřidáš.',
    }),
  ALREADY_FRIENDS: () =>
    new ConflictException({
      code: 'ALREADY_FRIENDS',
      message: 'Už jste přátelé.',
    }),
  ALREADY_REQUESTED: () =>
    new ConflictException({
      code: 'ALREADY_REQUESTED',
      message: 'Žádost už je odeslaná.',
    }),
  NO_REQUEST: () =>
    new ConflictException({
      code: 'NO_REQUEST',
      message: 'Žádná žádost o přátelství tu nečeká.',
    }),
  NO_FRIENDSHIP: () =>
    new NotFoundException({
      code: 'NO_FRIENDSHIP',
      message: 'Nejste přátelé a tvoje žádost tu nečeká.',
    }),
};

/**
 * 429 on `POST /api/friends/:userId`, on „Přidat“ in Najdi parťáka (#84) and on an invite's
 * „Přidat do přátel“ that ends up an ordinary request (#406) alike.
 */
export const FRIEND_REQUEST_DAILY_LIMIT = 'FRIEND_REQUEST_DAILY_LIMIT';
export const dailyLimit = (): HttpException =>
  new HttpException(
    {
      code: FRIEND_REQUEST_DAILY_LIMIT,
      message: 'Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra.',
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );

const userNotFound = (): HttpException =>
  new NotFoundException({
    code: 'USER_NOT_FOUND',
    message: 'Profil není dostupný.',
  });

/**
 * Friends (B-017, #307). Each action reads the pair's row, lets the domain rules decide and
 * writes on the condition of that state. When the state changed meanwhile (another tab, both
 * asking at once), the action is decided once more from a fresh read. Each answers with how the
 * viewer stands to the other afterwards, for the profile's button.
 *
 * Notifications (#86): a new request (also one sent again) tells the other, an acceptance tells
 * the one who asked, in the centre and by e-mail; a rejection and a removal stay silent
 * (decided 18. 11.).
 */
@Injectable()
export class FriendshipService {
  constructor(
    private readonly repository: FriendshipRepository,
    private readonly notifications: NotificationService,
    private readonly limits: FriendRequestLimitRepository,
  ) {}

  /** „Přidat do přátel“: a request, or accepting the other's (one row per pair). */
  async request(
    viewerId: string,
    otherId: string,
    now: Date = new Date(),
  ): Promise<FriendshipState> {
    if (viewerId !== otherId && !(await this.repository.isAvailable(otherId)))
      throw userNotFound();
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await this.repository.findPair(viewerId, otherId);
      const decision = decideRequest(row, viewerId, otherId);
      if (!decision.ok) throw REFUSALS[decision.refusal]();
      // a new request (also one sent again) only while today's limit lasts (#84); accepting always
      let done: boolean;
      if (decision.action === 'accept') {
        done = await this.repository.accept(viewerId, otherId, now);
      } else {
        const written = await this.limits.limited(
          viewerId,
          otherId,
          decision.action,
          startOfPragueDayOf(now),
          now,
        );
        if (written === 'limit') throw dailyLimit();
        done = written === 'written';
      }
      if (done) {
        // only the write that happened tells the other, after it is written (#86)
        this.notifications.notify({
          type:
            decision.action === 'accept' ? 'friend-accepted' : 'friend-request',
          fromId: viewerId,
          toId: otherId,
        });
        return decision.action === 'accept' ? 'friends' : 'outgoing';
      }
    }
    // the state kept changing under us: answer with where it is now
    return this.state(viewerId, otherId);
  }

  /** „Dnes ještě 5 přidání“: new requests left today (#84). */
  async requestsLeft(
    viewerId: string,
    now: Date = new Date(),
  ): Promise<number> {
    return friendRequestsLeft(
      await this.limits.sentSince(viewerId, startOfPragueDayOf(now)),
    );
  }

  /** „Odmítnout“: quietly, the other still sees „Žádost odeslána“. */
  async reject(viewerId: string, otherId: string): Promise<FriendshipState> {
    const row = await this.repository.findPair(viewerId, otherId);
    const decision = decideReject(row, viewerId, otherId);
    if (!decision.ok) throw REFUSALS[decision.refusal]();
    if (!(await this.repository.reject(viewerId, otherId)))
      throw REFUSALS.NO_REQUEST();
    return 'none';
  }

  /** „Zrušit žádost“ or „Odebrat z přátel“; then a request may be sent again. */
  async remove(viewerId: string, otherId: string): Promise<FriendshipState> {
    const row = await this.repository.findPair(viewerId, otherId);
    const decision = decideRemove(row, viewerId, otherId);
    if (!decision.ok) throw REFUSALS[decision.refusal]();
    if (!(await this.repository.remove(viewerId, otherId, decision.action)))
      throw REFUSALS.NO_FRIENDSHIP();
    return 'none';
  }

  /** How the viewer stands to the other (their profile's button, #179). */
  async state(viewerId: string, otherId: string): Promise<FriendshipState> {
    return friendshipState(
      await this.repository.findPair(viewerId, otherId),
      viewerId,
      otherId,
    );
  }

  /** „Lidé, které znám“: friends, requests waiting for me, my requests. */
  async lists(viewerId: string): Promise<FriendLists> {
    return friendLists(await this.repository.list(viewerId), viewerId);
  }
}
