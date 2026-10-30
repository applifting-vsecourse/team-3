import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** A place picked from the online search (OpenStreetMap), e.g. a village the catalog doesn't have yet. */
export class CreateLocalityDto {
  @ApiProperty({ example: 'Přívrat' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({
    example: 'okres Ústí nad Orlicí',
    description: 'Tells apart places of the same name („Lhota“)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  county?: string;

  // Czechia and a little around it
  @ApiProperty({ example: 49.9246 })
  @IsNumber()
  @Min(48.5)
  @Max(51.1)
  lat!: number;

  @ApiProperty({ example: 16.397 })
  @IsNumber()
  @Min(12)
  @Max(18.9)
  lng!: number;
}
