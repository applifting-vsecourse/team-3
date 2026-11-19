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

/** 403 for a signed-in user who is not the superadmin (B-062, #308). */
export const NOT_ADMIN = 'NOT_ADMIN';

/**
 * Every `/api/admin/*` endpoint (B-062, #308): only the superadmin
 * (`User.role = admin`). 401 without a session, 403 `NOT_ADMIN` for anyone
 * else, also for a blocked admin, and like `VerifiedUserGuard` 403
 * `AGE_CONFIRMATION_REQUIRED` until the age is confirmed (#107). All read
 * from the database, not the session: a role taken away must count at once,
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
      select: { role: true, blockedAt: true, ageConfirmedAt: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role !== 'admin' || user.blockedAt) {
      throw new ForbiddenException({
        code: NOT_ADMIN,
        message: 'Tohle může jen správce HobbyHubu.',
      });
    }
    if (!user.ageConfirmedAt) {
      throw new ForbiddenException({
        code: 'AGE_CONFIRMATION_REQUIRED',
        message: 'Nejdřív potvrď, že ti je alespoň 18 let.',
      });
    }

    request.session = session;
    return true;
  }
}
