import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * For public endpoints that show more to a signed-in user (e.g. the names of
 * participants on an event detail): loads the session when there is one and
 * never rejects. Read the user with @OptionalUser().
 */
@Injectable()
export class OptionalUserGuard implements CanActivate {
  constructor(@InjectBetterAuth private readonly betterAuth: BetterAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    request.session =
      (await getSessionFromRequest(request, this.betterAuth)) ?? null;
    return true;
  }
}
