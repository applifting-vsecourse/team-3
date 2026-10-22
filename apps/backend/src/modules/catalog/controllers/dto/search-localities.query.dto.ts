import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchLocalitiesQueryDto {
  @ApiPropertyOptional({
    example: 'pra',
    description:
      'Part of the name, with or without diacritics. At most 50 results; cities first.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;
}
