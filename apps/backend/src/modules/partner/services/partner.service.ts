import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  isPartnerHomeDue,
  NOT_SHOWN,
  partnerHomeHiddenUntil,
  partnerHomePreview,
  type PartnerHomePreview,
} from '@/modules/partner/domain/partner-home';
import {
  decodePartnerCursor,
  DEFAULT_PARTNER_RADIUS_KM,
  partnerCandidatesWhere,
  partnerPage,
  rankPartners,
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
  /** „Dnes ještě 5 přidání“: new friendship requests left today. */
  requestsLeft: number;
};

export type PartnerRequestResult = {
  /** `friends` = it was a match; `outgoing` = the request waits for them. */
  state: FriendshipState;
  requestsLeft: number;
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
    const requestsLeft = await this.friendships.requestsLeft(viewerId, now);
    const { home, interestIds } = viewer;
    const missing: PartnerSetupGap[] = [];
    if (!viewer.hasOnboarded) missing.push('onboarding');
    if (!home) missing.push('locality');
    if (interestIds.length === 0) missing.push('interests');
    const empty = { items: [], nextCursor: null, radiusKm, requestsLeft };
    if (!home || missing.length > 0) {
      return { ...empty, missing, hidden: !viewer.isDiscoverable };
    }
    if (!viewer.isDiscoverable) return { ...empty, missing, hidden: true };
    const candidates = await this.repository.candidates(
      viewerId,
      partnerCandidatesWhere(viewerId, { home, interestIds }, radiusKm, now),
    );
    const ranked = rankPartners({ home, interestIds }, candidates, radiusKm);
    return {
      ...partnerPage(ranked, after),
      radiusKm,
      missing,
      hidden: false,
      requestsLeft,
    };
  }

  /**
   * „Parťáci v okolí“ on the landing page (#474): the first three of the default deck, or
   * `isShown: false`. The cap is checked first, so a user who just visited /partaci or pressed
   * „Skrýt“ costs no deck at all.
   */
  async homePreview(
    viewerId: string,
    now: Date = new Date(),
  ): Promise<PartnerHomePreview> {
    const state = await this.repository.homeState(viewerId);
    if (!state) throw userNotFound();
    if (!isPartnerHomeDue(state, now)) return NOT_SHOWN;
    const deck = await this.suggestions(
      viewerId,
      DEFAULT_PARTNER_RADIUS_KM,
      undefined,
      now,
    );
    return partnerHomePreview(deck, state, now);
  }

  /** /partaci opened: the landing page's block stays away for 7 days. */
  async recordVisit(viewerId: string, now: Date = new Date()): Promise<void> {
    await this.repository.recordVisit(viewerId, now);
  }

  /** „Skrýt“ on the landing page: the block stays away for 30 days. */
  async hideHome(viewerId: string, now: Date = new Date()): Promise<void> {
    await this.repository.hideHome(viewerId, partnerHomeHiddenUntil(now));
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
      requestsLeft: await this.friendships.requestsLeft(viewerId, now),
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
