import { EmailModule } from '@/core/email/email.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { betterAuthProvider } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { seedMailer } from './seed-mailer';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRootAsync(Config, { validate: true }),
    EmailModule.forRootAsync({
      // in production without the verification links (N-6)
      useFactory: async (...args: unknown[]) => seedMailer(args[0] as Config),
      inject: [Config],
    }),
  ],
  providers: [Config, PrismaService, betterAuthProvider, SeedService],
})
export class SeedModule {}
