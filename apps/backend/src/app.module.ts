import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EventModule } from './modules/event/event.module';
import { GroupModule } from './modules/group/group.module';
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
];

@Module({
  imports,
})
export class AppModule {}
