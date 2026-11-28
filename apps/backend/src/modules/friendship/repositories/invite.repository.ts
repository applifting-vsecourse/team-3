import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import type { InviteeAccount } from '@/modules/friendship/domain/invite';
import { Injectable } from '@nestjs/common';

/**
 * The inviter as the invite shows them: what their public profile shows anyway (name and
 * interests, `GET /api/users/:id`), nothing more.
 */
export type Inviter = { id: string; name: string; interests: string[] };

/** The interests the sign-up's banner names („Volejbal, běh“). */
const INVITER_INTERESTS = 3;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/** Pozvánka od kamaráda (#406): the personal codes on `user.inviteCode`. */
@Injectable()
export class InviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The owner of the code, unless their account is blocked, deleted or not verified yet (then
   * like no code): an unverified account can't invite anyone into the app.
   */
  async findInviter(code: string): Promise<Inviter | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        inviteCode: code,
        emailVerified: true,
        deletedAt: null,
        blockedAt: null,
      },
      select: {
        id: true,
        name: true,
        interests: {
          select: { activity: { select: { name: true } } },
          orderBy: { activity: { name: 'asc' } },
          take: INVITER_INTERESTS,
        },
      },
    });
    return user
      ? {
          id: user.id,
          name: user.name,
          interests: user.interests.map(({ activity }) => activity.name),
        }
      : null;
  }

  async findCode(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    });
    return user?.inviteCode ?? null;
  }

  /**
   * Gives the user the code unless they have one already (another tab was quicker); false
   * then, or when the code is taken — the caller reads again or draws another.
   */
  async assignCode(userId: string, code: string): Promise<boolean> {
    try {
      const { count } = await this.prisma.user.updateMany({
        where: { id: userId, inviteCode: null },
        data: { inviteCode: code },
      });
      return count === 1;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  /** „Vytvořit nový odkaz“: a new code, the old one stops working; false when it is taken. */
  async replaceCode(userId: string, code: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { inviteCode: code },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  findInvitee(userId: string): Promise<InviteeAccount | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, invitedById: true },
    });
  }

  /** How many signed up through the inviter's link since then (the code's daily limit), or ever. */
  countInvited(inviterId: string, since?: Date): Promise<number> {
    return this.prisma.user.count({
      where: {
        invitedById: inviterId,
        ...(since ? { invitedAt: { gte: since } } : {}),
      },
    });
  }

  /** The invitee is now the inviter's, unless somebody's already (another tab was quicker). */
  async claim(
    inviteeId: string,
    inviterId: string,
    now: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: inviteeId, invitedById: null },
      data: { invitedById: inviterId, invitedAt: now },
    });
    return count === 1;
  }
}
