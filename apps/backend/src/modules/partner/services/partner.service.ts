import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import type { FriendRequestLimit } from '@/modules/friendship/domain/request-limit';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  decodePartnerCursor,
  partnerCandidatesWhere,
  partnerPage,
  rankPartners,
  withMutualFriends,
  type PartnerPage,
  type PartnerRadiusKm,
} from '@/modules/partner/domain/partner-suggestions';
import { PartnerRepository } from '@/modules/partner/repositories/partner.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** What the viewer still has to do before anyone can be suggested. */
export type PartnerSetupGap = 'onboarding' | 'locality' | 'interests';

export type PartnerSuggestions = PartnerPage & {
  radiusKm: PartnerRadiusKm;
  /** Empty when the deck could be built; otherwise the profile needs these first. */
  missing: PartnerSetupGap[];
  /**
   * „Ukazovat mě v Najdi parťáka“ is off: as Bumble's Snooze, whoever isn't seen doesn't see
   * anyone either (reciprocal), so the deck is empty until it is on again.
   */
  hidden: boolean;
  /** „Dnes ještě 5 přidání“: today's limit of new friendship requests (#473). */
  limit: FriendRequestLimit;
};

export type PartnerRequestResult = {
  /** `friends` = it was a match; `outgoing` = the request waits for them. */
  state: FriendshipState;
  limit: FriendRequestLimit;
};

/**
 * Najdi parťáka (#84). The deck is ranked whole on every page (`rankPartners`) and paged by the
 * last card's place in the order, so people skipped or liked between pages don't make anyone
 * else jump out. „Přidat“ is the friendship module's request (#307) — with its notifications
 * (#86) and its daily limit; „Teď ne“ is remembered here, „Vrátit“ forgets it.
 */
@Injectable()
export class PartnerService {
  constructor(
    private readonly repository: PartnerRepository,
    private readonly friendships: FriendshipService,
  ) {}

  async suggestions(
    viewerId: string,
    radiusKm: PartnerRadiusKm,
    cursor: string | undefined,
    now: Date = new Date(),
  ): Promise<PartnerSuggestions> {
    const after =
      cursor === undefined ? undefined : decodePartnerCursor(cursor);
    if (cursor !== undefined && !after) {
      throw new BadRequestException({
        code: 'INVALID_CURSOR',
        message: 'Další lidi se nepodařilo načíst. Zkus to znovu.',
      });
    }
    const viewer = await this.repository.viewer(viewerId);
    if (!viewer) throw userNotFound();
    const limit = await this.friendships.requestLimit(viewerId, now);
    const { home, interestIds } = viewer;
    const missing: PartnerSetupGap[] = [];
    if (!viewer.hasOnboarded) missing.push('onboarding');
    if (!home) missing.push('locality');
    if (interestIds.length === 0) missing.push('interests');
    const empty = { items: [], nextCursor: null, radiusKm, limit };
    if (!home || missing.length > 0) {
      return { ...empty, missing, hidden: !viewer.isDiscoverable };
    }
    if (!viewer.isDiscoverable) return { ...empty, missing, hidden: true };
    const candidates = await this.repository.candidates(
      viewerId,
      partnerCandidatesWhere(viewerId, { home, interestIds }, radiusKm, now),
    );
    const ranked = rankPartners({ home, interestIds }, candidates, radiusKm);
    const page = partnerPage(ranked, after);
    // counted for the page's cards only: the order never depends on it (#473)
    const mutual = await this.friendships.mutualFriendsCounts(
      viewerId,
      page.items.map(({ id }) => id),
    );
    return {
      items: page.items.map((partner) =>
        withMutualFriends(partner, mutual.get(partner.id) ?? null),
      ),
      nextCursor: page.nextCursor,
      radiusKm,
      missing,
      hidden: false,
      limit,
    };
  }

  /**
   * „Přidat“: a friendship request, or accepting theirs — the match. The friendship module
   * decides, notifies and keeps the daily limit (429 FRIEND_REQUEST_DAILY_LIMIT).
   */
  async request(
    viewerId: string,
    otherId: string,
    now: Date = new Date(),
  ): Promise<PartnerRequestResult> {
    const state = await this.friendships.request(viewerId, otherId, now);
    return {
      state,
      limit: await this.friendships.requestLimit(viewerId, now),
    };
  }

  /** „Teď ne“: the person won't come back for 90 days, on any device; they never learn of it. */
  async skip(
    viewerId: string,
    otherId: string,
    now: Date = new Date(),
  ): Promise<void> {
    if (viewerId === otherId) throw self();
    if (!(await this.repository.isAvailable(otherId))) throw userNotFound();
    await this.repository.skip(viewerId, otherId, now);
  }

  /** „Vrátit“: forgets the skip; nothing to forget is fine too. */
  async unskip(viewerId: string, otherId: string): Promise<void> {
    if (viewerId === otherId) throw self();
    await this.repository.unskip(viewerId, otherId);
  }
}

const userNotFound = (): NotFoundException =>
  new NotFoundException({
    code: 'USER_NOT_FOUND',
    message: 'Profil není dostupný.',
  });

const self = (): BadRequestException =>
  new BadRequestException({
    code: 'SELF',
    message: 'Sebe přeskočit nejde.',
  });
