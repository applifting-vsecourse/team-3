import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  participationWhere,
  profileSelect,
  type ProfileEvent,
  type ProfileOverview,
  type ProfileRow,
} from '@/modules/profile/domain/profile';
import {
  organizerRatingSummary,
  participantRatingSummary,
} from '@/modules/rating/domain/rating-summary';
import { Injectable } from '@nestjs/common';

const eventSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  status: true,
  locality: { select: { name: true } },
} satisfies Prisma.EventSelect;
type EventRow = Prisma.EventGetPayload<{ select: typeof eventSelect }>;
const eventSummary = (
  event: EventRow,
  participation: ProfileEvent['participation'] = null,
): ProfileEvent => ({
  id: event.id,
  title: event.title,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
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
    const [organizing, upcoming, past, participant, organizer] =
      await Promise.all([
        this.prisma.event.findMany({
          where: {
            organizerUserId: userId,
            status: { in: ['published', 'cancelled'] },
          },
          select: eventSelect,
          orderBy: { startsAt: 'desc' },
        }),
        this.prisma.participation.findMany({
          where: participationWhere(userId, now, false),
          select: { status: true, event: { select: eventSelect } },
          orderBy: { event: { startsAt: 'asc' } },
        }),
        this.prisma.participation.findMany({
          where: participationWhere(userId, now, true),
          select: { event: { select: eventSelect } },
          orderBy: { event: { startsAt: 'desc' } },
        }),
        this.prisma.participantRating.findMany({
          where: {
            participantId: userId,
            deletedAt: null,
            event: { status: 'published' },
          },
          select: {
            id: true,
            stars: true,
            comment: true,
            createdAt: true,
            deletedAt: true,
            event: {
              select: {
                id: true,
                title: true,
                organizer: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.rating.findMany({
          where: {
            deletedAt: null,
            event: {
              organizerUserId: userId,
              groupId: null,
              status: 'published',
            },
          },
          select: {
            id: true,
            organizerStars: true,
            comment: true,
            createdAt: true,
            deletedAt: true,
            user: { select: { id: true, name: true } },
            event: { select: { id: true, title: true, groupId: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
    return {
      organizing: organizing.map((event) => eventSummary(event)),
      upcoming: upcoming.map((row) =>
        eventSummary(
          row.event,
          row.status === 'approved' ? 'approved' : 'pending',
        ),
      ),
      past: past.map((row) => eventSummary(row.event, 'approved')),
      participantSummary: participantRatingSummary(participant),
      organizerSummary: organizerRatingSummary(organizer),
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
