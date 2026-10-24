import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_TYPES,
  GroupType,
} from '@/modules/group/domain/group';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// An empty description is no description, so it is stored as null.
const trimToNull = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? null : value.trim();
};

// PATCH: a missing key keeps the value; null is not "missing", so a required
// field sent as null fails validation instead of reaching the database.
const isPresent = (_: object, value: unknown): boolean => value !== undefined;

/** POST /groups (Figma D-06). */
export class CreateGroupDto {
  @ApiProperty({ example: 'Deskovky Holešovice' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(GROUP_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Empty or whitespace is stored as no description',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiProperty({ description: 'Exactly one activity (GET /activities)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  activityId!: string;

  @ApiProperty({
    description: 'Exactly one locality, a city or a district (GET /localities)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId!: string;

  @ApiProperty({
    enum: GROUP_TYPES,
    description: 'public: anyone joins at once; closed: an admin approves',
  })
  @IsIn(GROUP_TYPES)
  type!: GroupType;
}

/** PATCH /groups/:id (Figma D-07): any field of D-06, only the ones sent change. */
export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Deskovky Letná' })
  @ValidateIf(isPresent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(GROUP_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'null or empty removes the description',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(GROUP_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional()
  @ValidateIf(isPresent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  activityId?: string;

  @ApiPropertyOptional()
  @ValidateIf(isPresent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;

  @ApiPropertyOptional({ enum: GROUP_TYPES })
  @ValidateIf(isPresent)
  @IsIn(GROUP_TYPES)
  type?: GroupType;
}
