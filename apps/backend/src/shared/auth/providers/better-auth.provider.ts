import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { PrismaService } from '@/core/prisma/prisma.service';
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import {
  emailFlowOptions,
  withEmailFlows,
} from '@/shared/auth/config/email-flows';
import { rateLimitOptions } from '@/shared/auth/config/rate-limit';
import { Config } from '@/shared/config/config.service';
import { Inject, Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const createAuth = (
  prismaService: PrismaService,
  config: Config,
  emailProvider: EmailService,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  betterAuth({
    // Setup that affects the database is in the core config, so the migration
    // CLI sees it too; the e-mail flows are merged into it (withEmailFlows).
    ...withEmailFlows(
      betterAuthCoreConfig,
      emailFlowOptions(config, emailProvider),
    ),
    // Without this better-auth can only guess its own URL from the request,
    // which breaks callbacks and links built outside a request (e.g. the seed).
    baseURL: config.backendUrl,
    database: prismaAdapter(prismaService, {
      provider: 'postgresql',
    }),
    trustedOrigins: [config.frontendUrl],
    rateLimit: rateLimitOptions,
    plugins: [...(betterAuthCoreConfig.plugins ?? [])],
  });

export type BetterAuth = ReturnType<typeof createAuth>;

export const betterAuthProvider: Provider = {
  provide: 'BetterAuth',
  useFactory: (
    prismaService: PrismaService,
    config: Config,
    emailProvider: EmailService,
  ) => createAuth(prismaService, config, emailProvider),
  inject: [PrismaService, Config, 'EmailService'],
};

export const InjectBetterAuth = Inject('BetterAuth');
