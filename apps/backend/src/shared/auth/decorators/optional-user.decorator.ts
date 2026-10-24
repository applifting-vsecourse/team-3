import { Identity } from '@/shared/auth/domain/identity';
import {
  createParamDecorator,
  ExecutionContext,
  NotImplementedException,
} from '@nestjs/common';

/** What @OptionalUser() reads; separate so it can be tested without Nest. */
export const optionalUserFromRequest = (request: {
  session?: { user?: Identity } | null;
}): Identity | null => request.session?.user ?? null;

/** The signed-in user, or null for a visitor. Needs OptionalUserGuard. */
export const OptionalUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): Identity | null => {
    if (context.getType() === 'http') {
      return optionalUserFromRequest(context.switchToHttp().getRequest());
    }
    throw new NotImplementedException(
      `Cannot retrieve user from ${context.getType()} context`,
    );
  },
);
