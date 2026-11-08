import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class HomeQueryDto {
  @ApiPropertyOptional({
    description:
      "The page's locality (GET /localities); a city includes all its districts, a district covers its whole city " +
      '(only „Kousek od tebe“ is measured from the district itself). ' +
      'Without it a signed-in user gets the home locality from the profile, a visitor all of Czechia (the guess by IP comes with #55)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;
}
