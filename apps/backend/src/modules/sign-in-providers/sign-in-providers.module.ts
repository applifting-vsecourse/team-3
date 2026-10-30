import { Module } from '@nestjs/common';
import { SignInProvidersController } from './controllers/sign-in-providers.controller';

// Config comes from the global ConfigModule, like the welcome module's.
@Module({
  controllers: [SignInProvidersController],
})
export class SignInProvidersModule {}
