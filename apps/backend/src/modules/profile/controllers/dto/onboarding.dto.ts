import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeLocalityId!: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 3 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  interestIds!: string[];
}

export class OnboardingResultDto {
  @ApiProperty()
  onboardingCompletedAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  localitySlug!: string | null;

  @ApiProperty()
  hasInterests!: boolean;
}
