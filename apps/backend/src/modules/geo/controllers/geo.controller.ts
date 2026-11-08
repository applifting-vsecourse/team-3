import { GeoService } from '@/modules/geo/services/geo.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { clientIp } from './client-ip';
import { DefaultLocalityResponseDto } from './dto/default-locality.response.dto';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('locality')
  @UseGuards(OptionalUserGuard)
  // Differs per visitor: no shared cache may keep one visitor's answer for another.
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Default locality of the lists: the home locality from the profile, else a guess from the IP address, else all of Czechia (null). Neither the address nor the guess is stored.',
  })
  @ApiResponse({ status: 200, type: DefaultLocalityResponseDto })
  async defaultLocality(
    @OptionalUser() viewer: Identity | null,
    @Req() request: Request,
  ): Promise<DefaultLocalityResponseDto> {
    return DefaultLocalityResponseDto.fromDomain(
      await this.geoService.defaultLocality(viewer, clientIp(request)),
    );
  }
}
