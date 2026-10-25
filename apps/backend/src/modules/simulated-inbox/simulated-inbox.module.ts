import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { SimulatedInboxController } from './controllers/simulated-inbox.controller';
import { SimulatedInboxService } from './services/simulated-inbox.service';

// The inbox itself comes from the global MailModule (null unless console mailer).
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SimulatedInboxController],
  providers: [SimulatedInboxService],
})
export class SimulatedInboxModule {}
