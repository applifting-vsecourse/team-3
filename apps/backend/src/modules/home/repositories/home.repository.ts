import { PrismaService } from '@/core/prisma/prisma.service';
import { NO_NEW_REQUEST_STATUSES } from '@/modules/event/domain/participation';
import {
  groupRatingSummary,
  organizerRatingSummary,
  RatingSummary,
} from '@/modules/rating/domain/rating-summary';
import { Injectable } from '@nestjs/common';
import { buildOrganizerRatingsWhere } from './organizer-ratings-where';

export type HomeLocality = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** The city of a district; null for a city. */
  parentId: string | null;
};

/** What the landing page knows about the signed-in user; only their own data. */
export type HomeViewerData = {
  homeLocalityId: string | null;
  /** Interests in the profile and activities of events the user took part in. */
  interestActivityIds: string[];
  /**
   * Upcoming events the user can't ask to join any more: with their place or
   * waiting request, or where the organizer rejected or removed them.
   */
  joinedEventIds: string[];
};

@Injectable()
export class HomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLocality(id: string): Promise<HomeLocality | null> {
    return this.prisma.locality.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        lat: true,
        lng: true,
        parentId: true,
      },
    });
  }

  /** Null when the user doesn't exist (any more). */
  async findViewer(userId: string, now: Date): Promise<HomeViewerData | null> {
    const [user, attended, joined] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          homeLocalityId: true,
          interests: { select: { activityId: true } },
        },
      }),
      // B-027: „podle akcí, na kterých byl“ = an approved place at a past event
      this.prisma.participation.findMany({
        where: {
          userId,
          status: 'approved',
          event: { status: 'published', startsAt: { lte: now } },
        },
        select: { event: { select: { activityId: true } } },
        distinct: ['eventId'],
      }),
      // not offered again: the backend wouldn't take a new request (decideJoin)
      this.prisma.participation.findMany({
        where: {
          userId,
          status: { in: NO_NEW_REQUEST_STATUSES },
          event: { startsAt: { gt: now } },
        },
        select: { eventId: true },
      }),
    ]);
    if (!user) return null;
    return {
      homeLocalityId: user.homeLocalityId,
      interestActivityIds: [
        ...new Set([
          ...user.interests.map((interest) => interest.activityId),
          ...attended.map((participation) => participation.event.activityId),
        ]),
      ],
      joinedEventIds: joined.map((participation) => participation.eventId),
    };
  }

  /**
   * Rating summaries of the given organizers and groups (B-060), keyed like
   * `ratingKeyOf`: `user:<id>` and `group:<id>`. Only the stars, never who
   * gave them.
   */
  async findRatingSummaries(owners: {
    userIds: string[];
    groupIds: string[];
  }): Promise<Map<string, RatingSummary>> {
    if (owners.userIds.length === 0 && owners.groupIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.rating.findMany({
      where: buildOrganizerRatingsWhere(owners),
      select: {
        organizerStars: true,
        deletedAt: true,
        event: { select: { groupId: true, organizerUserId: true } },
      },
    });
    const summaries = new Map<string, RatingSummary>();
    for (const userId of owners.userIds) {
      const own = rows.filter((row) => row.event.organizerUserId === userId);
      summaries.set(`user:${userId}`, organizerRatingSummary(own));
    }
    for (const groupId of owners.groupIds) {
      summaries.set(`group:${groupId}`, groupRatingSummary(rows, groupId));
    }
    return summaries;
  }
}
