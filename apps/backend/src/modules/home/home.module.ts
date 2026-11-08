import { PrismaModule } from '@/core/prisma/prisma.module';
import { EventModule } from '@/modules/event/event.module';
import { GroupModule } from '@/modules/group/group.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { HomeController } from './controllers/home.controller';
import { HomeRepository } from './repositories/home.repository';
import { HomeService } from './services/home.service';

@Module({
  // AuthModule: a signed-in user gets their own sections
  imports: [PrismaModule, AuthModule, EventModule, GroupModule],
  controllers: [HomeController],
  providers: [HomeService, HomeRepository],
})
export class HomeModule {}
