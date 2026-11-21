import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  PROFILE_OVERVIEW_TAKE,
  profileSelect,
  type ProfileOverview,
  type ProfileRow,
} from '@/modules/profile/domain/profile';
import { summarizeTotals } from '@/modules/rating/domain/rating-summary';
import { Injectable } from '@nestjs/common';

const onboardingSelect = {
  onboardingCompletedAt: true,
  name: true,
  homeLocality: { select: { slug: true } },
  _count: { select: { interests: true } },
} satisfies Prisma.UserSelect;
type OnboardingRow = Prisma.UserGetPayload<{ select: typeof onboardingSelect }>;

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

  async finishOnboarding(
    userId: string,
    preferences: Prisma.UserUpdateInput,
  ): Promise<OnboardingRow | null> {
    const owner = { id: userId, deletedAt: null, blockedAt: null };
    const completedAt = new Date();
    try {
      // The profile and completion marker are written together. A retry or
      // another tab cannot replace the preferences after the first success.
      return await this.prisma.user.update({
        where: { ...owner, onboardingCompletedAt: null },
        data: {
          ...preferences,
          onboardingCompletedAt: completedAt,
          updatedAt: completedAt,
        },
        select: onboardingSelect,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2025'
      ) {
        throw error;
      }
      return this.prisma.user.findUnique({
        where: { ...owner, onboardingCompletedAt: { not: null } },
        select: onboardingSelect,
      });
    }
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

  async overview(userId: string): Promise<ProfileOverview> {
    const take = PROFILE_OVERVIEW_TAKE;
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
    const [participant, participantTotals, organizer, organizerTotals] =
      await Promise.all([
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
