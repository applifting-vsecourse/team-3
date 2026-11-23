import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountModule } from './modules/account/account.module';
import { AdminModule } from './modules/admin/admin.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EventModule } from './modules/event/event.module';
import { FriendshipModule } from './modules/friendship/friendship.module';
import { GeoModule } from './modules/geo/geo.module';
import { GroupModule } from './modules/group/group.module';
import { HomeModule } from './modules/home/home.module';
import { ImageModule } from './modules/image/image.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RatingModule } from './modules/rating/rating.module';
import { SignInProvidersModule } from './modules/sign-in-providers/sign-in-providers.module';
import { SimulatedInboxModule } from './modules/simulated-inbox/simulated-inbox.module';
import { UserModule } from './modules/user/user.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { AuthModule } from './shared/auth/auth.module';
import { Config } from './shared/config/config.service';
import { RateLimitModule } from './shared/rate-limit/rate-limit.module';

const imports = [
  ScheduleModule.forRoot(),
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  RateLimitModule,
  WelcomeModule,
  AccountModule,
  AdminModule,
  CatalogModule,
  EventModule,
  FriendshipModule,
  GroupModule,
  GeoModule,
  HomeModule,
  ImageModule,
  ProfileModule,
  RatingModule,
  SimulatedInboxModule,
  SignInProvidersModule,
  UserModule,
];

@Module({
  imports,
})
export class AppModule {}
