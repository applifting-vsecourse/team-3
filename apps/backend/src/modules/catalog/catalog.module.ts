import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogRepository } from './repositories/catalog.repository';
import { CatalogService } from './services/catalog.service';

@Module({
  // AuthModule: adding a place takes a signed-in user
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
