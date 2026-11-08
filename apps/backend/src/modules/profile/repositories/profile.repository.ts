import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  publicEventInclude,
  toPublicEvent,
  type PublicEventRow,
} from '@/modules/event/repositories/event.repository';
import { buildMyEventsWhere } from '@/modules/event/repositories/my-events-where';
import {
  participationWhere,
  PROFILE_OVERVIEW_TAKE,
  profileSelect,
  type ProfileEvent,
  type ProfileOverview,
  type ProfileRow,
} from '@/modules/profile/domain/profile';
import { summarizeTotals } from '@/modules/rating/domain/rating-summary';
import { Injectable } from '@nestjs/common';

const eventSummary = (
  event: PublicEventRow,
  now: Date,
  participation: ProfileEvent['participation'] = null,
): ProfileEvent => ({
  ...toPublicEvent(event, now),
  status: event.status === 'cancelled' ? 'cancelled' : 'published',
  localityName: event.locality.name,
  participation,
});

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string): Promise<ProfileRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
  }

  save(userId: string, data: Prisma.UserUpdateInput): Promise<ProfileRow> {
    return this.prisma.user.update({
      where: { id: userId, deletedAt: null, blockedAt: null },
      data,
      select: profileSelect,
    });
  }

  async localityExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.locality.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }

  async interestsExist(ids: string[]): Promise<boolean> {
    const rows = await this.prisma.activity.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.length === ids.length;
  }

  async overview(userId: string, now: Date): Promise<ProfileOverview> {
    const take = PROFILE_OVERVIEW_TAKE;
    // Exactly the Pořádám tab of Moje akce, where „Všechny“ leads.
    const organizingWhere = buildMyEventsWhere('organizing', userId, now);
    const upcomingWhere = participationWhere(userId, now, false);
    const pastWhere = participationWhere(userId, now, true);
    const participantWhere: Prisma.ParticipantRatingWhereInput = {
      participantId: userId,
      deletedAt: null,
      event: { status: 'published' },
    };
    // The same rows organizerRatingSummary counts: no deleted ratings, no group events.
    const organizerWhere: Prisma.RatingWhereInput = {
      deletedAt: null,
      event: { organizerUserId: userId, groupId: null, status: 'published' },
    };
    const [
      organizing,
      organizingTotal,
      upcoming,
      upcomingTotal,
      past,
      pastTotal,
      participant,
      participantTotals,
      organizer,
      organizerTotals,
    ] = await Promise.all([
      this.prisma.event.findMany({
        where: organizingWhere,
        include: publicEventInclude,
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take,
      }),
      this.prisma.event.count({ where: organizingWhere }),
      this.prisma.participation.findMany({
        where: upcomingWhere,
        select: { status: true, event: { include: publicEventInclude } },
        orderBy: [{ event: { startsAt: 'asc' } }, { event: { id: 'asc' } }],
        take,
      }),
      this.prisma.participation.count({ where: upcomingWhere }),
      this.prisma.participation.findMany({
        where: pastWhere,
        select: { event: { include: publicEventInclude } },
        orderBy: { event: { startsAt: 'desc' } },
        take,
      }),
      this.prisma.participation.count({ where: pastWhere }),
      this.prisma.participantRating.findMany({
        where: participantWhere,
        select: {
          id: true,
          stars: true,
          comment: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              title: true,
              organizer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.participantRating.aggregate({
        where: participantWhere,
        _sum: { stars: true },
        _count: { _all: true },
      }),
      this.prisma.rating.findMany({
        where: organizerWhere,
        select: {
          id: true,
          organizerStars: true,
          comment: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.rating.aggregate({
        where: organizerWhere,
        _sum: { organizerStars: true },
        _count: { _all: true },
      }),
    ]);
    return {
      organizing: organizing.map((event) => eventSummary(event, now)),
      organizingTotal,
      upcoming: upcoming.map((row) =>
        eventSummary(
          row.event,
          now,
          row.status === 'approved' ? 'approved' : 'pending',
        ),
      ),
      upcomingTotal,
      past: past.map((row) => eventSummary(row.event, now, 'approved')),
      pastTotal,
      // The whole history, not just the loaded slice: count = all ratings.
      participantSummary: summarizeTotals(
        participantTotals._sum.stars ?? 0,
        participantTotals._count._all,
      ),
      organizerSummary: summarizeTotals(
        organizerTotals._sum.organizerStars ?? 0,
        organizerTotals._count._all,
      ),
      participantRatings: participant.map((row) => ({
        id: row.id,
        stars: row.stars,
        comment: row.comment,
        createdAt: row.createdAt,
        event: { id: row.event.id, title: row.event.title },
        author: { id: row.event.organizer.id, name: row.event.organizer.name },
      })),
      organizerRatings: organizer.map((row) => ({
        id: row.id,
        stars: row.organizerStars,
        comment: row.comment,
        createdAt: row.createdAt,
        event: { id: row.event.id, title: row.event.title },
        author: { id: row.user.id, name: row.user.name },
      })),
    };
  }
}
