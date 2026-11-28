import { PrismaService } from '@/core/prisma/prisma.service';
import type { Prisma } from '@/generated/prisma/client';
import type { PartnerHomeState } from '@/modules/partner/domain/partner-home';
import type { PartnerCandidateRecord } from '@/modules/partner/domain/partner-suggestions';
import type { LatLng } from '@/shared/geo/distance';
import { Injectable } from '@nestjs/common';

/** What the viewer brings to the deck: where they live and what they like. */
export type PartnerViewerRecord = {
  home: LatLng | null;
  interestIds: string[];
  hasOnboarded: boolean;
  /** „Ukazovat mě v Najdi parťáka“ */
  isDiscoverable: boolean;
};

@Injectable()
export class PartnerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null for an account that is gone (deleted or blocked). */
  async viewer(viewerId: string): Promise<PartnerViewerRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: viewerId, deletedAt: null, blockedAt: null },
      select: {
        onboardingCompletedAt: true,
        partnerDiscoverable: true,
        homeLocality: { select: { lat: true, lng: true } },
        interests: { select: { activityId: true } },
      },
    });
    if (!user) return null;
    return {
      home: user.homeLocality,
      interestIds: user.interests.map(({ activityId }) => activityId),
      hasOnboarded: user.onboardingCompletedAt !== null,
      isDiscoverable: user.partnerDiscoverable,
    };
  }

  /**
   * The people the `where` lets through (`partnerCandidatesWhere`), each with their interests
   * and their request to the viewer if one still waits („Posílá ti žádost“).
   */
  candidates(
    viewerId: string,
    where: Prisma.UserWhereInput,
  ): Promise<PartnerCandidateRecord[]> {
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        homeLocality: { select: { lat: true, lng: true } },
        interests: {
          select: {
            activity: { select: { id: true, name: true, slug: true } },
          },
        },
        sentFriendRequests: {
          where: { addresseeId: viewerId, status: 'pending' },
          select: { id: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  /** Whether the person can be skipped: an account that isn't blocked or deleted. */
  async isAvailable(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, blockedAt: null },
      select: { id: true },
    });
    return user !== null;
  }

  /** „Teď ne“: one row per direction of the pair; skipping again starts the 90 days anew. */
  async skip(skipperId: string, skippedId: string, now: Date): Promise<void> {
    await this.prisma.partnerSkip.upsert({
      where: { skipperId_skippedId: { skipperId, skippedId } },
      create: { skipperId, skippedId, createdAt: now },
      update: { createdAt: now },
    });
  }

  /** „Vrátit“: the skip is gone, the person is in the deck again. */
  async unskip(skipperId: string, skippedId: string): Promise<void> {
    await this.prisma.partnerSkip.deleteMany({
      where: { skipperId, skippedId },
    });
  }

  /**
   * The frequency cap of „Parťáci v okolí“ (#474): the last visit to /partaci, „Skrýt“ and how
   * many friends — accepted, the other account neither blocked nor deleted, as the friend list
   * shows them. Null for an account that is gone.
   */
  async homeState(viewerId: string): Promise<PartnerHomeState | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: viewerId, deletedAt: null, blockedAt: null },
      select: { partnersVisitedAt: true, partnersHomeHiddenUntil: true },
    });
    if (!user) return null;
    const available = { deletedAt: null, blockedAt: null };
    const friendsCount = await this.prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: viewerId, addressee: available },
          { addresseeId: viewerId, requester: available },
        ],
      },
    });
    return {
      visitedAt: user.partnersVisitedAt,
      hiddenUntil: user.partnersHomeHiddenUntil,
      friendsCount,
    };
  }

  /** A visit to /partaci: the landing page's block stays away for the next 7 days. */
  async recordVisit(viewerId: string, now: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: viewerId },
      data: { partnersVisitedAt: now },
    });
  }

  /** „Skrýt“ on the landing page: the block stays away until then. */
  async hideHome(viewerId: string, until: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: viewerId },
      data: { partnersHomeHiddenUntil: until },
    });
  }
}
