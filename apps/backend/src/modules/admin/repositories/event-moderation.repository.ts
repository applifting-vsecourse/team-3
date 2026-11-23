import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ModeratedStatus,
  ModerationDecision,
} from '@/modules/admin/domain/event-moderation';
import { Injectable } from '@nestjs/common';

type Decide = (status: ModeratedStatus) => ModerationDecision;

/**
 * The superadmin's interventions on an event (#308, B-063). Each runs under a
 * row lock on the event, like joining or changing it: a join that waits for
 * the lock then reads the new status. Null when there is no such event (or
 * it is deleted).
 */
@Injectable()
export class EventModerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Deactivates the event and writes `hide_event` to the history. */
  async hideEvent(
    eventId: string,
    adminId: string,
    reason: string,
    decide: Decide,
  ): Promise<ModerationDecision | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { status: true },
      });
      if (!event || event.status === 'deleted') return null;
      const decision = decide(event.status);
      if (!decision.ok) return decision;
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'hidden' },
      });
      await tx.moderationAction.create({
        data: {
          type: 'hide_event',
          targetType: 'event',
          targetId: eventId,
          reason,
          adminId,
        },
      });
      return decision;
    });
  }

  /**
   * Publishes the event again and marks its deactivation as reverted, by
   * whom and when. The history keeps the row (B-063: every intervention can
   * be reverted, and the history shows it).
   */
  async unhideEvent(
    eventId: string,
    adminId: string,
    now: Date,
    decide: Decide,
  ): Promise<ModerationDecision | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { status: true },
      });
      if (!event || event.status === 'deleted') return null;
      const decision = decide(event.status);
      if (!decision.ok) return decision;
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'published' },
      });
      await tx.moderationAction.updateMany({
        where: {
          type: 'hide_event',
          targetType: 'event',
          targetId: eventId,
          revertedAt: null,
        },
        data: { revertedAt: now, revertedById: adminId },
      });
      return decision;
    });
  }
}
