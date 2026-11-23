import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RATE_LIMIT_OPTIONS } from './rate-limits';

/**
 * All of the API's rate limits in one global ThrottlerModule (a second
 * `forRoot` would make its options ambiguous). Routes pick theirs with the
 * guards in rate-limit.guards.ts.
 */
@Module({
  imports: [ThrottlerModule.forRoot(RATE_LIMIT_OPTIONS)],
})
export class RateLimitModule {}
