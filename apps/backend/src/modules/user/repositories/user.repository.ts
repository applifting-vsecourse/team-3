import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import type { PublicEvent } from '@/modules/event/domain/event';
import {
  publicEventInclude,
  toPublicEvent,
} from '@/modules/event/repositories/event.repository';
import {
  FRIEND_UPCOMING_TAKE,
  friendUpcomingEventsWhere,
} from '@/modules/user/domain/friend-events';
import {
  finishedEventWhere,
  PAST_EVENTS_TAKE,
  type AttendedEventRecord,
  type PersonalRatingRecord,
  type PublicEventRecord,
  type PublicUserRecord,
  type ReceivedRatingRecord,
} from '@/modules/user/domain/public-profile';
import { Injectable } from '@nestjs/common';

/** What a past event card needs (Figma Karta akce/Proběhlá řádek). */
const pastEventSelect = {
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
} satisfies Prisma.EventSelect;

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
        bio: true,
        photoImageKey: true,
        photoVisibility: true,
        bioVisibility: true,
        pastEventsVisibility: true,
        interests: {
          select: { activity: { select: { id: true, name: true } } },
          orderBy: { activity: { name: 'asc' } },
        },
      },
    });
  }
  /** „Kam jde“ for a friend (#307): the nearest few, as the event cards show them. */
  async friendUpcomingEvents(
    personId: string,
    viewerId: string,
    now: Date,
  ): Promise<PublicEvent[]> {
    const events = await this.prisma.event.findMany({
      where: friendUpcomingEventsWhere(personId, viewerId, now),
      include: publicEventInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: FRIEND_UPCOMING_TAKE,
    });
    return events.map((event) => toPublicEvent(event, now));
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
        select: pastEventSelect,
        orderBy: { startsAt: 'desc' },
      }),
    ]);
    return { received, personal, events };
  }

  /**
   * Whether the person has applied to an event the viewer organizes (B-014,
   * #64): a pending or an approved application, at any time.
   */
  async isOrganizerFor(viewerId: string, personId: string): Promise<boolean> {
    const application = await this.prisma.participation.findFirst({
      where: {
        userId: personId,
        status: { in: ['pending', 'approved'] },
        event: { organizerUserId: viewerId },
      },
      select: { id: true },
    });
    return application !== null;
  }

  /**
   * Visited events (#64): public, published and over, with an approved place,
   * organized by someone else (their own are `organizedEvents`); the latest
   * first, at most PAST_EVENTS_TAKE.
   */
  attendedEvents(personId: string, now: Date): Promise<AttendedEventRecord[]> {
    return this.prisma.event.findMany({
      where: {
        participations: { some: { userId: personId, status: 'approved' } },
        organizerUserId: { not: personId },
        visibility: 'public',
        status: 'published',
        ...finishedEventWhere(now),
      },
      select: {
        ...pastEventSelect,
        ratings: { where: { deletedAt: null }, select: { eventStars: true } },
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      take: PAST_EVENTS_TAKE,
    });
  }
}
