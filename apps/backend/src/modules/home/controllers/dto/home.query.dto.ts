import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// `?wholeCountry=true` arrives as a string; anything else than true/false is a 400
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class HomeQueryDto {
  @ApiPropertyOptional({
    description:
      "The page's locality (GET /localities); a city includes all its districts, a district covers its whole city " +
      '(only „Kousek od tebe“ is measured from the district itself). ' +
      'Without it (and without wholeCountry) a signed-in user gets the home locality from the profile, a visitor all of Czechia',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;

  @ApiPropertyOptional({
    description:
      'All of Czechia, picked on purpose (#299): no home locality from the profile in its place. Ignored with localityId',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  wholeCountry?: boolean;
}
