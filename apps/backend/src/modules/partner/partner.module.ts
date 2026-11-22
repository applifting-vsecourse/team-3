import { PrismaModule } from '@/core/prisma/prisma.module';
import { FriendshipModule } from '@/modules/friendship/friendship.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { PartnersController } from './controllers/partners.controller';
import { PartnerRepository } from './repositories/partner.repository';
import { PartnerService } from './services/partner.service';

/** Najdi parťáka (#84). */
@Module({
  // FriendshipModule: „Přidat“ is its request, with the notifications (#307, #86)
  imports: [PrismaModule, AuthModule, FriendshipModule],
  controllers: [PartnersController],
  providers: [PartnerService, PartnerRepository],
})
export class PartnerModule {}
