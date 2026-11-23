import { randomBytes } from 'node:crypto';
import { startOfPragueDayOf } from '@/modules/event/domain/prague-day';
import {
  friendshipState,
  type FriendshipRow,
  type FriendshipState,
} from '@/modules/friendship/domain/friendship';
import {
  decideInviteAccept,
  INVITE_CODE_BYTES,
  INVITE_CODE_PATTERN,
  inviteClaim,
  inviteCodeOf,
  inviteLimitSince,
} from '@/modules/friendship/domain/invite';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import {
  InviteRepository,
  type Inviter,
} from '@/modules/friendship/repositories/invite.repository';
import { FriendRequestLimitRepository } from '@/modules/friendship/repositories/request-limit.repository';
import { dailyLimit } from '@/modules/friendship/services/friendship.service';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { Config } from '@/shared/config/config.service';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export type MyInvite = { code: string; url: string; joinedCount: number };

const inviteNotFound = (): HttpException =>
  new NotFoundException({
    code: 'INVITE_NOT_FOUND',
    message: 'Pozvánka neplatí.',
  });

type WriteAction = 'befriend' | 'promote' | 'accept' | 'request' | 'resend';

/**
 * Pozvánka od kamaráda (#406). My link, who a code belongs to, and answering the invite in the
 * onboarding. An invalid code and a blocked or deleted inviter are one and the same 404, so the
 * public lookup says nothing about accounts beyond what a public profile shows anyway.
 *
 * Notifications (#86): a newly invited user tells the inviter once
 * (`friend-invite-joined`, with or without the friendship); a friendship made later from the
 * invite tells them like an acceptance, an ordinary request like a request.
 */
@Injectable()
export class InviteService {
  constructor(
    private readonly invites: InviteRepository,
    private readonly friendships: FriendshipRepository,
    private readonly notifications: NotificationService,
    private readonly config: Config,
    private readonly limits: FriendRequestLimitRepository,
  ) {}

  /** The CSPRNG; a test may put a fixed one in. */
  random: (size: number) => Uint8Array = randomBytes;

  /** „Pozvi kamaráda“: my link, drawn on the first ask, and how many joined through it. */
  async mine(userId: string): Promise<MyInvite> {
    const [code, joinedCount] = await Promise.all([
      this.codeOf(userId),
      this.invites.countInvited(userId),
    ]);
    return { code, url: this.urlOf(code), joinedCount };
  }

  /** „Vytvořit nový odkaz“: a new code; the old link stops working at once. */
  async regenerate(userId: string): Promise<MyInvite> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = this.draw();
      if (await this.invites.replaceCode(userId, code)) {
        return {
          code,
          url: this.urlOf(code),
          joinedCount: await this.invites.countInvited(userId),
        };
      }
    }
    throw new InternalServerErrorException('Odkaz se nepodařilo vytvořit.');
  }

  /** The inviter's public name and interests for „{jméno} tě zve na HobbyHub“, or 404. */
  async inviter(code: string): Promise<Inviter> {
    if (!INVITE_CODE_PATTERN.test(code)) throw inviteNotFound();
    const inviter = await this.invites.findInviter(code);
    if (!inviter) throw inviteNotFound();
    return inviter;
  }

  /**
   * The onboarding's answer to „{jméno} tě sem zve“: `befriend` = „Přidat do přátel“, else
   * „Teď ne“. A new account becomes the inviter's invitee once (`inviteClaim`) and, with
   * `befriend` in that same answer, their friend at once; otherwise „Přidat do přátel“ is an
   * ordinary request (`decideInviteAccept`). Answers how the invitee stands to the inviter afterwards.
   */
  async accept(
    inviteeId: string,
    code: string,
    befriend: boolean,
    now: Date = new Date(),
  ): Promise<FriendshipState> {
    const inviter = await this.inviter(code);
    if (inviter.id === inviteeId)
      throw new BadRequestException({
        code: 'SELF',
        message: 'Tohle je tvoje vlastní pozvánka.',
      });
    const account = await this.invites.findInvitee(inviteeId);
    if (!account) throw inviteNotFound();
    const joinedToday = await this.invites.countInvited(
      inviter.id,
      inviteLimitSince(now),
    );
    // count, then claim: two sign-ups at the very same moment may pass 20 per inviter per day
    // by one, which the limit (against bulk fake accounts, not an exact quota) accepts
    const isNewlyClaimed =
      inviteClaim(account, joinedToday, now) === 'claim' &&
      (await this.invites.claim(inviteeId, inviter.id, now));
    // friends at once only in the answer that claims the invite: asking again later (after the
    // inviter's „Odebrat z přátel“, say) is an ordinary request
    const isInvited = isNewlyClaimed;

    const outcome = befriend
      ? await this.befriend(inviteeId, inviter.id, isInvited, now)
      : {
          state: await this.stateOf(inviteeId, inviter.id),
          written: null,
          isLimited: false,
        };

    if (isNewlyClaimed) {
      this.notifications.notify({
        type: 'friend-invite-joined',
        fromId: inviteeId,
        toId: inviter.id,
        befriended: outcome.state === 'friends',
      });
    } else if (outcome.written) {
      this.notifications.notify({
        type:
          outcome.written === 'request' || outcome.written === 'resend'
            ? 'friend-request'
            : 'friend-accepted',
        fromId: inviteeId,
        toId: inviter.id,
      });
    }
    // an ordinary request counts towards today's limit like any other (#84)
    if (outcome.isLimited) throw dailyLimit();
    return outcome.state;
  }

  /** „Přidat do přátel“: writes what the rules decided, once more from a fresh read if it raced. */
  private async befriend(
    inviteeId: string,
    inviterId: string,
    isInvited: boolean,
    now: Date,
  ): Promise<{
    state: FriendshipState;
    written: WriteAction | null;
    isLimited: boolean;
  }> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await this.friendships.findPair(inviteeId, inviterId);
      const decision = decideInviteAccept(row, inviteeId, inviterId, isInvited);
      if (!decision.ok || decision.action === 'none')
        return {
          state: decision.ok ? decision.state : 'self',
          written: null,
          isLimited: false,
        };
      const result = await this.write(
        decision.action,
        row,
        inviteeId,
        inviterId,
        now,
      );
      if (result === 'limit')
        return {
          state: friendshipState(row, inviteeId, inviterId),
          written: null,
          isLimited: true,
        };
      if (result)
        return {
          state: decision.state,
          written: decision.action,
          isLimited: false,
        };
    }
    // the pair's row kept changing under us: answer with where it is now
    return {
      state: await this.stateOf(inviteeId, inviterId),
      written: null,
      isLimited: false,
    };
  }

  private async stateOf(
    inviteeId: string,
    inviterId: string,
  ): Promise<FriendshipState> {
    return friendshipState(
      await this.friendships.findPair(inviteeId, inviterId),
      inviteeId,
      inviterId,
    );
  }

  private write(
    action: WriteAction,
    row: FriendshipRow | null,
    inviteeId: string,
    inviterId: string,
    now: Date,
  ): Promise<boolean | 'limit'> {
    switch (action) {
      case 'befriend':
        return this.friendships.createAccepted(inviterId, inviteeId, now);
      case 'promote':
        return row
          ? this.friendships.promote(row, now)
          : Promise.resolve(false);
      case 'accept':
        return this.friendships.accept(inviteeId, inviterId, now);
      case 'request':
      case 'resend':
        // a request (also one sent again) goes through the one daily limit (#84)
        return this.limited(action, inviteeId, inviterId, now);
    }
  }

  private async limited(
    action: 'request' | 'resend',
    inviteeId: string,
    inviterId: string,
    now: Date,
  ): Promise<boolean | 'limit'> {
    const written = await this.limits.limited(
      inviteeId,
      inviterId,
      action === 'request' ? 'create' : 'resend',
      startOfPragueDayOf(now),
      now,
    );
    return written === 'limit' ? 'limit' : written === 'written';
  }

  private urlOf(code: string): string {
    // the configured frontend, never the request's Host (OWASP Forgot Password Cheat Sheet)
    return new URL(`/pozvanka/${code}`, this.config.frontendUrl).toString();
  }

  private draw(): string {
    return inviteCodeOf(this.random(INVITE_CODE_BYTES));
  }

  private async codeOf(userId: string): Promise<string> {
    const existing = await this.invites.findCode(userId);
    if (existing) return existing;
    // a collision of 128 random bits won't happen; the loop covers another tab being quicker
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = this.draw();
      if (await this.invites.assignCode(userId, code)) return code;
      const assigned = await this.invites.findCode(userId);
      if (assigned) return assigned;
    }
    throw new InternalServerErrorException('Odkaz se nepodařilo vytvořit.');
  }
}
