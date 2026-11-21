import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeLocalityId!: string;

  @ApiProperty({ type: [String], minItems: 3, maxItems: 3 })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  interestIds!: string[];

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string | null;
}

export class OnboardingResultDto {
  @ApiProperty()
  onboardingCompletedAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  localitySlug!: string | null;

  @ApiProperty()
  hasInterests!: boolean;

  @ApiProperty()
  displayName!: string;
}
