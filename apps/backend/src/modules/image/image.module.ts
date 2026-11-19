import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ImagesController } from './controllers/images.controller';
import { ImageRepository } from './repositories/image.repository';

/**
 * Uploaded images of events and groups (#77), stored in Postgres and served
 * at /api/images/:key. Setting one is the event's or the group's own
 * endpoint: who may do it is their rule.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ImagesController],
  providers: [ImageRepository],
})
export class ImageModule {}
