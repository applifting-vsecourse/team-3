import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EventModule } from './modules/event/event.module';
import { GeoModule } from './modules/geo/geo.module';
import { GroupModule } from './modules/group/group.module';
import { HomeModule } from './modules/home/home.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RatingModule } from './modules/rating/rating.module';
import { SignInProvidersModule } from './modules/sign-in-providers/sign-in-providers.module';
import { SimulatedInboxModule } from './modules/simulated-inbox/simulated-inbox.module';
import { UserModule } from './modules/user/user.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { AuthModule } from './shared/auth/auth.module';
import { Config } from './shared/config/config.service';

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  WelcomeModule,
  CatalogModule,
  EventModule,
  GroupModule,
  GeoModule,
  HomeModule,
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
