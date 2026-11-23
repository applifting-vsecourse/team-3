import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
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
import { BIO_MAX_LENGTH, UpdateProfileDto } from './update-profile.dto';

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

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: BIO_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX_LENGTH, {
    message: `Napiš o sobě nejvýš ${BIO_MAX_LENGTH} znaků.`,
  })
  bio?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string | null;
}

export class OnboardingProfileDto extends OmitType(UpdateProfileDto, [
  'homeLocalityId',
  'interestIds',
] as const) {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeLocalityId!: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
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

  @ApiProperty()
  displayName!: string;
}
