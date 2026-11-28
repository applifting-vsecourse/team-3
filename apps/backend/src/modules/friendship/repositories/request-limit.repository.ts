import { PrismaService } from '@/core/prisma/prisma.service';
import type { Prisma } from '@/generated/prisma/client';
import { friendshipPairKey } from '@/modules/friendship/domain/friendship';
import { FRIEND_REQUESTS_PER_DAY } from '@/modules/friendship/domain/request-limit';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

/** What a limited write did: written, nothing changed (decided meanwhile), or over the limit. */
export type LimitedWrite = 'written' | 'unchanged' | 'limit';

/**
 * The daily limit of new requests (#84), race-safe: the count and the write run in one
 * transaction under a per-user advisory lock, so two requests at once can't both see 19. The
 * writes here are the request's own (`create`, `resend`) on the transaction's client; accepting
 * someone's request isn't limited and stays in `FriendshipRepository`.
 */
@Injectable()
export class FriendRequestLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Requests the user sent since the moment, from their own log: cancelling a request deletes
   * its row and its notification (#430), the log stays, so cancelling and asking again doesn't
   * reset the day.
   */
  sentSince(
    userId: string,
    since: Date,
    db: Db = this.prisma,
  ): Promise<number> {
    return db.friendRequestLog.count({
      where: { requesterId: userId, createdAt: { gte: since } },
    });
  }

  /** A new request or one sent again, if today's limit allows it. */
  limited(
    requesterId: string,
    addresseeId: string,
    action: 'create' | 'resend',
    since: Date,
    now: Date,
  ): Promise<LimitedWrite> {
    return this.prisma.$transaction(async (db) => {
      // one requester at a time: held until the transaction ends
      await db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${requesterId}))`;
      if (
        (await this.sentSince(requesterId, since, db)) >=
        FRIEND_REQUESTS_PER_DAY
      ) {
        return 'limit';
      }
      const isWritten =
        action === 'create'
          ? await this.create(db, requesterId, addresseeId)
          : await this.resend(db, requesterId, addresseeId, now);
      if (!isWritten) return 'unchanged';
      await db.friendRequestLog.create({
        data: { requesterId, createdAt: now },
      });
      return 'written';
    });
  }

  /**
   * A new request; false when the pair got a row meanwhile. `skipDuplicates` (ON CONFLICT DO
   * NOTHING) rather than catching the unique violation, which would abort the transaction.
   */
  private async create(
    db: Db,
    requesterId: string,
    addresseeId: string,
  ): Promise<boolean> {
    const { count } = await db.friendship.createMany({
      data: [
        {
          requesterId,
          addresseeId,
          pairKey: friendshipPairKey(requesterId, addresseeId),
        },
      ],
      skipDuplicates: true,
    });
    return count === 1;
  }

  /** The one who rejected asks themselves: the row turns round (as `FriendshipRepository`). */
  private async resend(
    db: Db,
    viewerId: string,
    otherId: string,
    now: Date,
  ): Promise<boolean> {
    const { count } = await db.friendship.updateMany({
      where: {
        pairKey: friendshipPairKey(viewerId, otherId),
        requesterId: otherId,
        addresseeId: viewerId,
        status: 'rejected',
      },
      data: {
        requesterId: viewerId,
        addresseeId: otherId,
        status: 'pending',
        acceptedAt: null,
        createdAt: now,
      },
    });
    return count === 1;
  }
}
