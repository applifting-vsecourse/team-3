import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UserRepository, UserService],
})
export class UserModule {}
