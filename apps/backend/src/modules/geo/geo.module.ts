import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Logger, Module } from '@nestjs/common';
import { GeoController } from './controllers/geo.controller';
import { IpLocalityTable } from './domain/ip-locality-table';
import { GeoRepository } from './repositories/geo.repository';
import { GeoService, IP_LOCALITY_TABLE } from './services/geo.service';

/** Without the table every visitor starts in all of Czechia; the app still runs. */
function loadIpLocalityTable(): IpLocalityTable | null {
  try {
    return new IpLocalityTable(
      readFileSync(join(__dirname, 'data/ip-localities-cz.txt'), 'utf8'),
    );
  } catch (error) {
    new Logger('GeoModule').warn(`No IP locality table: ${error}`);
    return null;
  }
}

@Module({
  // AuthModule: a signed-in user's home locality comes first
  imports: [PrismaModule, AuthModule],
  controllers: [GeoController],
  providers: [
    GeoService,
    GeoRepository,
    { provide: IP_LOCALITY_TABLE, useFactory: loadIpLocalityTable },
  ],
})
export class GeoModule {}
