import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';

/**
 * For public endpoints that show more to a signed-in user (e.g. the names of
 * participants on an event detail): loads the session when there is one and
 * never rejects. Read the user with @OptionalUser().
 */
@Injectable()
export class OptionalUserGuard implements CanActivate {
  private readonly logger = new Logger(OptionalUserGuard.name);

  constructor(@InjectBetterAuth private readonly betterAuth: BetterAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      request.session =
        (await getSessionFromRequest(request, this.betterAuth)) ?? null;
    } catch (error) {
      // The endpoint is public: a failed session lookup serves the visitor
      // variant instead of a 500.
      this.logger.warn(`Session lookup failed, serving as visitor: ${error}`);
      request.session = null;
    }
    return true;
  }
}
