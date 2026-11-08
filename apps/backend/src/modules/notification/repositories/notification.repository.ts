import { PrismaService } from '@/core/prisma/prisma.service';
import {
  NotifiedAnnouncement,
  NotifiedEvent,
  Recipient,
} from '@/modules/notification/domain/notification';
import { Injectable } from '@nestjs/common';

// Nobody blocked (B-063) or deleted (B-080) is written to.
const deliverable = { blockedAt: null, deletedAt: null } as const;
const recipientSelect = { id: true, name: true, email: true } as const;

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** What the e-mails say of the event; null when it is gone. */
  async findEvent(eventId: string): Promise<NotifiedEvent | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        address: true,
        cancelReason: true,
        maxParticipants: true,
        organizerUserId: true,
        _count: {
          select: { participations: { where: { status: 'approved' } } },
        },
      },
    });
    if (!event) return null;
    const { _count, organizerUserId, ...rest } = event;
    return {
      ...rest,
      approvedCount: _count.participations,
      organizerId: organizerUserId,
    };
  }

  /** The name of somebody the e-mail is about, whoever they are now. */
  async findPersonName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name ?? null;
  }

  /** These users, except those who can't be written to. */
  async findRecipients(userIds: string[]): Promise<Recipient[]> {
    if (userIds.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: userIds }, ...deliverable },
      select: recipientSelect,
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Everyone with a place or a waiting request in the event (B-041), except
   * `exceptUserId`: the organizer who cancels or changes the event doesn't
   * need an e-mail about it, even when they signed up for their own event.
   */
  async findAudience(
    eventId: string,
    exceptUserId: string,
  ): Promise<Recipient[]> {
    const participations = await this.prisma.participation.findMany({
      where: {
        eventId,
        status: { in: ['approved', 'pending'] },
        userId: { not: exceptUserId },
        user: deliverable,
      },
      select: { user: { select: recipientSelect } },
      orderBy: { id: 'asc' },
    });
    return participations.map((participation) => participation.user);
  }

  /** What a group announcement's e-mail says (#194); null when it is gone. */
  async findAnnouncement(id: string): Promise<NotifiedAnnouncement | null> {
    return this.prisma.groupAnnouncement.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        body: true,
        senderId: true,
        group: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * The group's active members, admins included (#194). A pending request
   * or a block is not membership.
   */
  async findActiveMembers(groupId: string): Promise<Recipient[]> {
    const members = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'active',
        user: deliverable,
      },
      select: { user: { select: recipientSelect } },
      orderBy: { id: 'asc' },
    });
    return members.map((member) => member.user);
  }
}
