import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/** 403 codes the frontend reacts to (B-011). */
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';
export const USER_BLOCKED = 'USER_BLOCKED';

/**
 * For actions that need a verified e-mail: joining an event, creating events
 * and groups (B-011). 401 without a session; 403 `EMAIL_NOT_VERIFIED` before
 * the e-mail is verified, 403 `USER_BLOCKED` for a user the superadmin
 * blocked. Both are read from the database, not the session: the session
 * cookie can still say „unverified“ right after the link was clicked.
 */
@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(
    @InjectBetterAuth private readonly betterAuth: BetterAuth,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const session = await getSessionFromRequest(request, this.betterAuth);
    if (!session) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, blockedAt: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.blockedAt) {
      throw new ForbiddenException({
        code: USER_BLOCKED,
        message: 'Your account is blocked',
      });
    }
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: EMAIL_NOT_VERIFIED,
        message: 'Verify your e-mail address first',
      });
    }

    request.session = session;
    return true;
  }
}
