import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CatalogController } from './controllers/catalog.controller';
import {
  LOCALITY_THROTTLER_OPTIONS,
  LocalityThrottlerGuard,
} from './controllers/locality-throttler.guard';
import { CatalogRepository } from './repositories/catalog.repository';
import { CatalogService } from './services/catalog.service';

@Module({
  // AuthModule: adding a place takes a signed-in user with a verified e-mail
  imports: [
    PrismaModule,
    AuthModule,
    ThrottlerModule.forRoot(LOCALITY_THROTTLER_OPTIONS),
  ],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository, LocalityThrottlerGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
