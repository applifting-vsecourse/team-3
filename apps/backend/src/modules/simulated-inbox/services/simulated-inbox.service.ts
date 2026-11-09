import {
  SIMULATED_INBOX,
  SimulatedEmail,
  SimulatedInbox,
} from '@/core/email/simulated-inbox/simulated-inbox';
import { PrismaService } from '@/core/prisma/prisma.service';
import { USER_BLOCKED } from '@/shared/auth/guards/verified-user.guard';
import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export const SIMULATED_INBOX_OFF = 'SIMULATED_INBOX_OFF';
/** BetterAuth's code for a refused sign-in, so the app says the same. */
export const INVALID_EMAIL_OR_PASSWORD = 'INVALID_EMAIL_OR_PASSWORD';

export type InboxCredentials = { email: string; password: string };

/** 404 where e-mails really go out; the guard in front answers it too. */
export const simulatedInboxOff = (): NotFoundException =>
  new NotFoundException({
    code: SIMULATED_INBOX_OFF,
    message: 'Simulovaná schránka je vypnutá: e-maily se posílají skutečně.',
  });

/**
 * A BetterAuth (scrypt) hash of a password nobody has. Checked instead when
 * there is no account or no password, so an unknown e-mail takes as long as
 * a wrong password, as on BetterAuth's own sign-in (#236 review).
 */
export const DUMMY_PASSWORD_HASH =
  '90d9cf75028c8f74bafccb8e65333605:259aa9d7edce74f84c71d93f20eaefbb11ac538183be1aedbfba2196f61cd42ed1a95d4a162288c7561ff468cbc1fda288c87d393726cc9b181f562729b85976';

const invalidEmailOrPassword = (): UnauthorizedException =>
  new UnauthorizedException({
    code: INVALID_EMAIL_OR_PASSWORD,
    message: 'Nesprávný e-mail nebo heslo.',
  });

@Injectable()
export class SimulatedInboxService {
  constructor(
    @Inject(SIMULATED_INBOX) private readonly inbox: SimulatedInbox | null,
    private readonly prisma: PrismaService,
    @InjectBetterAuth private readonly betterAuth: BetterAuth,
  ) {}

  /**
   * The verification e-mails sent to the account, newest first (#58).
   * 404 `SIMULATED_INBOX_OFF` when e-mails really go out (Resend or SMTP),
   * before anything else: there it is no way to test passwords. Then the
   * password, as on sign-in (#236: an unverified e-mail gets no session):
   * 401 `INVALID_EMAIL_OR_PASSWORD`, the same — in content and in time —
   * for an unknown e-mail, a wrong password and a verified account: only an
   * unverified one needs the inbox, and answering a verified one would tell
   * which addresses have an account. A blocked user may not look.
   */
  async getMessages({
    email,
    password,
  }: InboxCredentials): Promise<SimulatedEmail[]> {
    if (!this.inbox) throw simulatedInboxOff();
    // BetterAuth keeps e-mails lower-cased, and the password on the
    // credential account
    const account = await this.prisma.account.findFirst({
      where: {
        providerId: 'credential',
        user: { email: email.trim().toLowerCase() },
      },
      select: {
        password: true,
        user: { select: { email: true, emailVerified: true, blockedAt: true } },
      },
    });
    // always one scrypt check, with the dummy hash when there is nothing to check
    const matches = await this.passwordMatches(
      account?.password ?? DUMMY_PASSWORD_HASH,
      password,
    );
    if (!account?.password || !matches || account.user.emailVerified) {
      throw invalidEmailOrPassword();
    }
    if (account.user.blockedAt) {
      throw new ForbiddenException({
        code: USER_BLOCKED,
        message: 'Tvůj účet je zablokovaný.',
      });
    }
    return this.inbox.messagesFor(account.user.email);
  }

  /** BetterAuth's own check, the one its sign-in uses. */
  private async passwordMatches(
    hash: string,
    password: string,
  ): Promise<boolean> {
    const context = await this.betterAuth.$context;
    try {
      return await context.password.verify({ hash, password });
    } catch {
      // not a BetterAuth hash: no password of this account
      return false;
    }
  }
}
