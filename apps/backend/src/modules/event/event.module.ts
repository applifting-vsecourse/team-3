import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventsController } from './controllers/events.controller';
import { GroupEventsController } from './controllers/group-events.controller';
import { MyEventsController } from './controllers/my-events.controller';
import { EventRepository } from './repositories/event.repository';
import { EventsService } from './services/events.service';

@Module({
  // AuthModule: the detail resolves the session when there is one
  imports: [PrismaModule, AuthModule],
  controllers: [EventsController, GroupEventsController, MyEventsController],
  providers: [EventsService, EventRepository],
  exports: [EventsService],
})
export class EventModule {}
