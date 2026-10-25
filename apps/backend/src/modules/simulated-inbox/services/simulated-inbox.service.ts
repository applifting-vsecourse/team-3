import {
  SIMULATED_INBOX,
  SimulatedEmail,
  SimulatedInbox,
} from '@/core/email/simulated-inbox/simulated-inbox';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Identity } from '@/shared/auth/domain/identity';
import { USER_BLOCKED } from '@/shared/auth/guards/verified-user.guard';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export const SIMULATED_INBOX_OFF = 'SIMULATED_INBOX_OFF';

@Injectable()
export class SimulatedInboxService {
  constructor(
    @Inject(SIMULATED_INBOX) private readonly inbox: SimulatedInbox | null,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * The verification e-mails sent to the signed-in user, newest first (#58).
   * 404 `SIMULATED_INBOX_OFF` when e-mails really go out (Resend or SMTP);
   * an unverified user may look (that's what it's for), a blocked one not.
   */
  async getMessages(user: Identity): Promise<SimulatedEmail[]> {
    if (!this.inbox) {
      throw new NotFoundException({
        code: SIMULATED_INBOX_OFF,
        message:
          'Simulovaná schránka je vypnutá: e-maily se posílají skutečně.',
      });
    }
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { blockedAt: true },
    });
    if (account?.blockedAt) {
      throw new ForbiddenException({
        code: USER_BLOCKED,
        message: 'Tvůj účet je zablokovaný.',
      });
    }
    return this.inbox.messagesFor(user.email);
  }
}
