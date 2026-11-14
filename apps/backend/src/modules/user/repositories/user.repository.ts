import { PrismaService } from '@/core/prisma/prisma.service';
import {
  finishedEventWhere,
  type PersonalRatingRecord,
  type PublicEventRecord,
  type PublicUserRecord,
  type ReceivedRatingRecord,
} from '@/modules/user/domain/public-profile';
import { Injectable } from '@nestjs/common';

export type PublicProfileDetails = {
  received: ReceivedRatingRecord[];
  personal: PersonalRatingRecord[];
  events: PublicEventRecord[];
};
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  getPublicUser(id: string): Promise<PublicUserRecord | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null, blockedAt: null },
      select: {
        id: true,
        name: true,
        interests: {
          select: { activity: { select: { id: true, name: true } } },
          orderBy: { activity: { name: 'asc' } },
        },
      },
    });
  }
  async details(userId: string, now: Date): Promise<PublicProfileDetails> {
    const finished = finishedEventWhere(now);
    const [received, personal, events] = await Promise.all([
      this.prisma.participantRating.findMany({
        where: {
          participantId: userId,
          deletedAt: null,
          event: { status: 'published', ...finished },
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
              visibility: true,
              status: true,
              startsAt: true,
              endsAt: true,
              organizer: {
                select: {
                  id: true,
                  name: true,
                  deletedAt: true,
                  blockedAt: true,
                },
              },
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
            ...finished,
          },
        },
        select: {
          organizerStars: true,
          eventStars: true,
          deletedAt: true,
          event: {
            select: {
              id: true,
              groupId: true,
              organizerUserId: true,
              status: true,
              startsAt: true,
              endsAt: true,
            },
          },
        },
      }),
      this.prisma.event.findMany({
        where: {
          organizerUserId: userId,
          groupId: null,
          visibility: 'public',
          status: 'published',
          ...finished,
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          visibility: true,
          groupId: true,
          organizerUserId: true,
          address: true,
          minParticipants: true,
          locality: { select: { id: true, slug: true, name: true } },
          activity: {
            select: {
              id: true,
              slug: true,
              name: true,
              category: {
                select: { id: true, slug: true, name: true, icon: true },
              },
            },
          },
          _count: {
            select: { participations: { where: { status: 'approved' } } },
          },
        },
        orderBy: { startsAt: 'desc' },
      }),
    ]);
    return { received, personal, events };
  }
}
