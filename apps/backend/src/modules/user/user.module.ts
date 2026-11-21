import { PrismaModule } from '@/core/prisma/prisma.module';
import { FriendshipModule } from '@/modules/friendship/friendship.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  // AuthModule: who is looking (OptionalUserGuard); FriendshipModule: how they stand (#307)
  imports: [PrismaModule, AuthModule, FriendshipModule],
  controllers: [UsersController],
  providers: [UserRepository, UserService],
})
export class UserModule {}
