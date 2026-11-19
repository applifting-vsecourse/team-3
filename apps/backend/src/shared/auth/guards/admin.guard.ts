import { PrismaService } from '@/core/prisma/prisma.service';
import {
  SUPERADMIN_ACCOUNT_SELECT,
  superadminRefusal,
  SuperadminRefusal,
} from '@/shared/auth/domain/superadmin';
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

/** 403 for a signed-in user who is not the superadmin (B-062, #308). */
export const NOT_ADMIN = 'NOT_ADMIN';

const REFUSALS: Record<SuperadminRefusal, { code: string; message: string }> = {
  NOT_ADMIN: { code: NOT_ADMIN, message: 'Tohle může jen správce HobbyHubu.' },
  AGE_CONFIRMATION_REQUIRED: {
    code: 'AGE_CONFIRMATION_REQUIRED',
    message: 'Nejdřív potvrď, že ti je alespoň 18 let.',
  },
};

/**
 * Every `/api/admin/*` endpoint (B-062, #308): only the superadmin
 * (`User.role = admin`). 401 without a session, 403 `NOT_ADMIN` for anyone
 * else, also for a blocked admin, and like `VerifiedUserGuard` 403
 * `AGE_CONFIRMATION_REQUIRED` until the age is confirmed (#107), by the
 * shared rule `superadminRefusal`. All read from the database, not the
 * session: a role taken away must count at once,
 * not when the session cookie is refreshed.
 */
@Injectable()
export class AdminGuard implements CanActivate {
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
      select: SUPERADMIN_ACCOUNT_SELECT,
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const refusal = superadminRefusal(user);
    if (refusal) {
      throw new ForbiddenException(REFUSALS[refusal]);
    }

    request.session = session;
    return true;
  }
}
