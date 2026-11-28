import { Env } from '@applifting-io/nestjs-decorated-config';
import { Injectable } from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsSemVer,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

/**
 * A config class that is populated from environment variables and enable the use of validation decorators.
 */
@Injectable()
export class Config {
  // basic info
  readonly name: string = 'HobbyHub backend';
  readonly description: string =
    'Backend for HobbyHub, a platform for finding people to share hobbies and activities with.';

  @IsSemVer()
  readonly version: string = '0.1.0';

  @Env<string>('CI_COMMIT_SHA', { expose: true })
  @IsOptional()
  readonly gitCommitSha?: string;

  @Env<string>('BETTER_AUTH_SECRET')
  @IsNotEmpty()
  readonly betterAuthSecret!: string;

  /** Empty = no superadmin is seeded; the seed logs why (#308). */
  @Env('SUPERADMIN_EMAIL')
  @IsOptional()
  readonly superadminEmail?: string;

  /** Locally only: production never takes it, see superadminAccount (#308, review #380). */
  @Env('SUPERADMIN_PASSWORD')
  @IsOptional()
  readonly superadminPassword?: string;

  @Env('NODE_ENV', { expose: true })
  @IsOptional()
  readonly nodeEnv?: string;

  @Env('BACKEND_URL', {
    defaultValue: 'http://localhost:4050',
    expose: true,
    removeTrailingSlash: true,
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  readonly backendUrl!: string;

  @Env('FRONTEND_URL', {
    defaultValue: 'http://localhost:3050',
    expose: true,
    removeTrailingSlash: true,
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  readonly frontendUrl!: string;

  @Env('FRONTEND_RESET_PASSWORD_ROUTE', {
    defaultValue: 'reset-password',
    expose: true,
  })
  @IsNotEmpty()
  readonly frontendResetPasswordUrl!: string;

  @Env('PORT', { expose: true, defaultValue: 4050 })
  readonly port!: number;

  // How many proxies in front of the backend add to X-Forwarded-For (Express
  // `trust proxy`), so `request.ip` is the client's and a client can't set it
  // (#236 review). 0 = none: the connection's address. Staging sets 1 in
  // Dockerfile.deploy (Coolify's proxy). Never more than really are there.
  @Env('TRUST_PROXY_HOPS', { expose: true, defaultValue: 0 })
  @IsInt()
  @Min(0)
  readonly trustProxyHops!: number;

  @Env('RESEND_API_KEY')
  @IsOptional()
  readonly resendApiKey?: string;

  // Each transport supplies its own default when no sender is configured.
  @Env('EMAIL_FROM', { expose: true })
  @IsOptional()
  @IsString()
  readonly emailFrom?: string;

  @Env('SMTP_HOST', { expose: true })
  @IsOptional()
  readonly smtpHost?: string;

  @Env('SMTP_SECURE', { expose: true, defaultValue: true })
  @IsBoolean()
  readonly smtpSecure!: boolean;

  @Env('SMTP_PORT', { expose: true, defaultValue: 465 })
  readonly smtpPort!: number;

  @Env('SMTP_USERNAME', { expose: true })
  @IsOptional()
  readonly smtpUsername?: string;

  @Env('SMTP_PASSWORD')
  @IsOptional()
  readonly smtpPassword?: string;

  // The simulated inbox (#58): "true" or "false"; unset or empty = off in
  // production, on elsewhere (simulated-inbox-enabled.ts). Never with real mail.
  @Env('SIMULATED_INBOX', { expose: true })
  @IsOptional()
  @IsIn(['', 'true', 'false'])
  readonly simulatedInbox?: string;

  // Swagger (/api/docs) and BetterAuth's reference page (N-9): "true" or
  // "false"; unset or empty = off in production, on elsewhere
  // (api-docs-enabled.ts). Staging turns them on in Dockerfile.deploy.
  @Env('API_DOCS', { expose: true })
  @IsOptional()
  @IsIn(['', 'true', 'false'])
  readonly apiDocs?: string;

  // Sign-in with Google (#154): only with both set, otherwise the app offers
  // e-mail and password alone. Setup: docs/prihlaseni-pres-google.md.
  @Env('GOOGLE_CLIENT_ID', { expose: true })
  @IsOptional()
  readonly googleClientId?: string;

  @Env('GOOGLE_CLIENT_SECRET')
  @IsOptional()
  readonly googleClientSecret?: string;

  // Refusing passwords from data breaches (#153, Have I Been Pwned): "true" or
  // "false"; unset or empty = on in production, off elsewhere
  // (breached-passwords.ts). A string, not a boolean: @Env turns a missing
  // boolean into false, which would switch it off in production too.
  @Env('PWNED_PASSWORDS_CHECK', { expose: true })
  @IsOptional()
  @IsIn(['', 'true', 'false'])
  readonly pwnedPasswordsCheck?: string;

  // The paid plan (#473, B-071): off until the simulated payment (B-070) exists. While off,
  // everybody's daily limit is the free one and nothing in the app mentions plans; the
  // frontend has its own VITE_PREMIUM_ENABLED for the „Zobrazit tarify“ link.
  @Env('PREMIUM_ENABLED', { expose: true, defaultValue: false })
  @IsBoolean()
  readonly premiumEnabled!: boolean;

  // Topping an event (B-073, #69) doesn't exist yet. Once it does, "true"
  // adds „Topovat akci“ to the organizer's overview before an event (#405).
  @Env('TOPPING_ENABLED', { expose: true, defaultValue: false })
  @IsBoolean()
  readonly toppingEnabled!: boolean;
}
