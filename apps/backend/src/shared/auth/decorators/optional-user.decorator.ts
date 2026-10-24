import { Identity } from '@/shared/auth/domain/identity';
import {
  createParamDecorator,
  ExecutionContext,
  NotImplementedException,
} from '@nestjs/common';

/** The signed-in user, or null for a visitor. Needs OptionalUserGuard. */
export const OptionalUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): Identity | null => {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.session?.user ?? null;
    }
    throw new NotImplementedException(
      `Cannot retrieve user from ${context.getType()} context`,
    );
  },
);
