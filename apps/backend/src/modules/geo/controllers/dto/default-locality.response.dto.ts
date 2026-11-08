import { LocalityResponseDto } from '@/modules/catalog/controllers/dto/locality.response.dto';
import type { DefaultLocality } from '@/modules/geo/services/geo.service';
import { ApiProperty } from '@nestjs/swagger';

export class DefaultLocalityResponseDto {
  @ApiProperty({
    type: LocalityResponseDto,
    nullable: true,
    description: 'null = all of Czechia',
  })
  locality!: LocalityResponseDto | null;

  @ApiProperty({
    enum: ['home', 'ip', 'none'],
    description:
      'home = from the profile, ip = guessed from the IP address, none = nothing known',
  })
  source!: DefaultLocality['source'];

  static fromDomain(result: DefaultLocality): DefaultLocalityResponseDto {
    return {
      locality: result.locality
        ? LocalityResponseDto.fromDomain(result.locality)
        : null,
      source: result.source,
    };
  }
}
