import { startOfPragueDayOf } from '@/modules/event/domain/prague-day';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  decodePartnerCursor,
  partnerCandidatesWhere,
  partnerPage,
  rankPartners,
  requestsLeft,
  type PartnerPage,
  type PartnerRadiusKm,
} from '@/modules/partner/domain/partner-suggestions';
import { PartnerRepository } from '@/modules/partner/repositories/partner.repository';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** What the viewer still has to fill in before anyone can be suggested. */
export type PartnerSetupGap = 'locality' | 'interests';

export type PartnerSuggestions = PartnerPage & {
  radiusKm: PartnerRadiusKm;
  /** Empty when the deck could be built; otherwise the profile needs these first. */
  missing: PartnerSetupGap[];
  /** „Dnes ještě 5 přidání“: what is left of today's „Přidat“. */
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
 * (#86) — under a daily limit; „Teď ne“ is remembered here, „Vrátit“ forgets it.
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
    const left = requestsLeft(
      await this.repository.requestsSentSince(
        viewerId,
        startOfPragueDayOf(now),
      ),
    );
    const { home, interestIds } = viewer;
    const missing: PartnerSetupGap[] = [];
    if (!home) missing.push('locality');
    if (interestIds.length === 0) missing.push('interests');
    if (!home || missing.length > 0) {
      return {
        items: [],
        nextCursor: null,
        radiusKm,
        missing,
        requestsLeft: left,
      };
    }
    const candidates = await this.repository.candidates(
      viewerId,
      partnerCandidatesWhere(viewerId, { home, interestIds }, radiusKm, now),
    );
    const ranked = rankPartners({ home, interestIds }, candidates, radiusKm);
    return {
      ...partnerPage(ranked, after),
      radiusKm,
      missing,
      requestsLeft: left,
    };
  }

  /**
   * „Přidat“: a friendship request, or accepting theirs — the match. Accepting is always allowed;
   * a new request only while today's limit lasts (`PARTNER_DAILY_REQUESTS`).
   */
  async request(
    viewerId: string,
    otherId: string,
    now: Date = new Date(),
  ): Promise<PartnerRequestResult> {
    const since = startOfPragueDayOf(now);
    const isAccepting =
      (await this.friendships.state(viewerId, otherId)) === 'incoming';
    if (
      !isAccepting &&
      requestsLeft(await this.repository.requestsSentSince(viewerId, since)) ===
        0
    ) {
      throw new HttpException(
        {
          code: 'PARTNER_DAILY_LIMIT',
          message: 'Na dnešek máš přidáno dost. Další lidi můžeš přidat zítra.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const state = await this.friendships.request(viewerId, otherId, now);
    return {
      state,
      requestsLeft: requestsLeft(
        await this.repository.requestsSentSince(viewerId, since),
      ),
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
