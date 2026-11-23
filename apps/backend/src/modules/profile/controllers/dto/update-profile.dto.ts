import {
  PROFILE_VISIBILITIES,
  type ProfileVisibility,
} from '@/modules/profile/domain/profile';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** As the database's `VarChar(500)` (B-013). */
export const BIO_MAX_LENGTH = 500;
const VISIBILITY =
  'Who sees it on the public profile (B-014, #64): everyone; friends = friends and organizers of events I applied to; organizers = only those organizers; nobody = only me';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Display name, using the sign-up name policy',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: BIO_MAX_LENGTH,
    description: 'About me (#64); empty or null clears it',
  })
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX_LENGTH, {
    message: `Napiš o sobě nejvýš ${BIO_MAX_LENGTH} znaků.`,
  })
  bio?: string | null;

  @ApiPropertyOptional({ enum: PROFILE_VISIBILITIES, description: VISIBILITY })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(PROFILE_VISIBILITIES)
  photoVisibility?: ProfileVisibility;

  @ApiPropertyOptional({ enum: PROFILE_VISIBILITIES, description: VISIBILITY })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(PROFILE_VISIBILITIES)
  bioVisibility?: ProfileVisibility;

  @ApiPropertyOptional({ enum: PROFILE_VISIBILITIES, description: VISIBILITY })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(PROFILE_VISIBILITIES)
  pastEventsVisibility?: ProfileVisibility;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeLocalityId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  interestIds?: string[];
}

export class UpdateProfileWithPhotoDto extends UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Remove the uploaded photo; not together with a new one',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  removePhoto?: boolean;
}
