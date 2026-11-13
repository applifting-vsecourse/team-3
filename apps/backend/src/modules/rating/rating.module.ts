import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventRatingController } from './controllers/event-rating.controller';
import { RatingRepository } from './repositories/rating.repository';
import { RatingService } from './services/rating.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EventRatingController],
  providers: [RatingService, RatingRepository],
})
export class RatingModule {}
