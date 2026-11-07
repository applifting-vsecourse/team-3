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
   * 401 `INVALID_EMAIL_OR_PASSWORD`, the same for an unknown e-mail and a
   * wrong password. An unverified user may look (that's what it's for), a
   * blocked one not.
   */
  async getMessages({
    email,
    password,
  }: InboxCredentials): Promise<SimulatedEmail[]> {
    if (!this.inbox) {
      throw new NotFoundException({
        code: SIMULATED_INBOX_OFF,
        message:
          'Simulovaná schránka je vypnutá: e-maily se posílají skutečně.',
      });
    }
    // BetterAuth keeps e-mails lower-cased, and the password on the
    // credential account
    const account = await this.prisma.account.findFirst({
      where: {
        providerId: 'credential',
        user: { email: email.trim().toLowerCase() },
      },
      select: {
        password: true,
        user: { select: { email: true, blockedAt: true } },
      },
    });
    if (
      !account?.password ||
      !(await this.passwordMatches(account.password, password))
    ) {
      throw new UnauthorizedException({
        code: INVALID_EMAIL_OR_PASSWORD,
        message: 'Nesprávný e-mail nebo heslo.',
      });
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
