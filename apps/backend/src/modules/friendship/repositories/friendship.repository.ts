import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import type { FriendshipRecord } from '@/modules/friendship/domain/friend-list';
import {
  friendshipPairKey,
  type FriendshipRow,
} from '@/modules/friendship/domain/friendship';
import { Injectable } from '@nestjs/common';

const personSelect = {
  id: true,
  name: true,
  deletedAt: true,
  blockedAt: true,
  interests: {
    select: { activity: { select: { id: true, name: true } } },
    orderBy: { activity: { name: 'asc' } },
  },
} satisfies Prisma.UserSelect;

/** The rows of a user, whichever side they are on (the lists of „Lidé, které znám“). */
export const userFriendshipsWhere = (
  userId: string,
): Prisma.FriendshipWhereInput => ({
  OR: [{ requesterId: userId }, { addresseeId: userId }],
});

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/**
 * Every write is conditional on the state the rules decided from (`updateMany`/`deleteMany`
 * with the expected status and sides), so a request decided meanwhile in another tab isn't
 * overwritten: the write reports that nothing changed and the service answers from a fresh read.
 */
@Injectable()
export class FriendshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Whether the person can be asked: an account that isn't blocked or deleted. */
  async isAvailable(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, blockedAt: null },
      select: { id: true },
    });
    return user !== null;
  }

  findPair(oneId: string, otherId: string): Promise<FriendshipRow | null> {
    return this.prisma.friendship.findUnique({
      where: { pairKey: friendshipPairKey(oneId, otherId) },
      select: { requesterId: true, addresseeId: true, status: true },
    });
  }

  /** A new request; false when the pair got a row meanwhile (both asked at once). */
  async create(requesterId: string, addresseeId: string): Promise<boolean> {
    try {
      await this.prisma.friendship.create({
        data: {
          requesterId,
          addresseeId,
          pairKey: friendshipPairKey(requesterId, addresseeId),
        },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  /** The viewer accepts the other's waiting request. */
  async accept(viewerId: string, otherId: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.friendship.updateMany({
      where: {
        pairKey: friendshipPairKey(viewerId, otherId),
        requesterId: otherId,
        addresseeId: viewerId,
        status: 'pending',
      },
      data: { status: 'accepted', acceptedAt: now },
    });
    return count === 1;
  }

  /** The viewer quietly rejects the other's waiting request. */
  async reject(viewerId: string, otherId: string): Promise<boolean> {
    const { count } = await this.prisma.friendship.updateMany({
      where: {
        pairKey: friendshipPairKey(viewerId, otherId),
        requesterId: otherId,
        addresseeId: viewerId,
        status: 'pending',
      },
      data: { status: 'rejected' },
    });
    return count === 1;
  }

  /** The one who rejected asks themselves: the row turns round, a new request from the viewer. */
  async resend(viewerId: string, otherId: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.friendship.updateMany({
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

  /**
   * Pozvánka (#406): the invited friend confirmed, and there is no row yet: a friendship at
   * once, as if the inviter had asked and the invitee accepted. False when the pair got a row
   * meanwhile.
   */
  async createAccepted(
    inviterId: string,
    inviteeId: string,
    now: Date,
  ): Promise<boolean> {
    try {
      await this.prisma.friendship.create({
        data: {
          requesterId: inviterId,
          addresseeId: inviteeId,
          pairKey: friendshipPairKey(inviterId, inviteeId),
          status: 'accepted',
          acceptedAt: now,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  /**
   * Pozvánka (#406): the pair's row as the rules saw it (a request either way, a quiet
   * rejection) becomes the friendship; false when it changed meanwhile.
   */
  async promote(row: FriendshipRow, now: Date): Promise<boolean> {
    const { count } = await this.prisma.friendship.updateMany({
      where: {
        pairKey: friendshipPairKey(row.requesterId, row.addresseeId),
        requesterId: row.requesterId,
        addresseeId: row.addresseeId,
        status: row.status,
      },
      data: { status: 'accepted', acceptedAt: now },
    });
    return count === 1;
  }

  /** „Zrušit žádost“ (the viewer's request, also a rejected one) or „Odebrat z přátel“. */
  async remove(
    viewerId: string,
    otherId: string,
    action: 'cancel' | 'unfriend',
  ): Promise<boolean> {
    const { count } = await this.prisma.friendship.deleteMany({
      where: {
        pairKey: friendshipPairKey(viewerId, otherId),
        ...(action === 'cancel'
          ? { requesterId: viewerId, status: { in: ['pending', 'rejected'] } }
          : { status: 'accepted' }),
      },
    });
    return count === 1;
  }

  list(userId: string): Promise<FriendshipRecord[]> {
    return this.prisma.friendship.findMany({
      where: userFriendshipsWhere(userId),
      select: {
        requesterId: true,
        addresseeId: true,
        status: true,
        createdAt: true,
        requester: { select: personSelect },
        addressee: { select: personSelect },
      },
    });
  }
}
