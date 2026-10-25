import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
} from 'class-validator';
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_PARTICIPANTS,
  EVENT_TITLE_MAX_LENGTH,
  ParsableDate,
} from './create-event.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// `@IsOptional()` lets null through as well, and these columns can't be
// null: the database would refuse it with a 500. Only a missing field is skipped.
const IsOptionalNotNull = (): PropertyDecorator =>
  ValidateIf((_dto: object, value: unknown) => value !== undefined);

// A coordinate on its own would move the pin half way: both or neither.
const IsPartOfPlace = (): PropertyDecorator =>
  ValidateIf(
    (dto: UpdateEventDto) => dto.lat !== undefined || dto.lng !== undefined,
  );

/**
 * PATCH /events/:id (B-028, #41): the fields the form lets the organizer
 * change. Not the activity nor the way of joining (design decision for
 * D-02): sending them is a 400 thanks to `forbidNonWhitelisted`. Rules that
 * need the stored event (max ≥ min, max ≥ approved, a future start) are the
 * service's.
 */
export class UpdateEventDto {
  @ApiPropertyOptional({ maxLength: EVENT_TITLE_MAX_LENGTH })
  @IsOptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({
    maxLength: EVENT_DESCRIPTION_MAX_LENGTH,
    description: 'An empty string clears it',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(EVENT_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional()
  @IsOptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;

  @ApiPropertyOptional()
  @IsPartOfPlace()
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional()
  @IsPartOfPlace()
  @IsNumber()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ maxLength: EVENT_ADDRESS_MAX_LENGTH })
  @IsOptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_ADDRESS_MAX_LENGTH)
  address?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptionalNotNull()
  @IsDateString({ strict: true })
  @Validate(ParsableDate)
  startsAt?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'null clears the end; after the start (the service checks it against the stored start)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  endsAt?: string | null;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptionalNotNull()
  @IsInt()
  @Min(1)
  @Max(EVENT_MAX_PARTICIPANTS)
  minParticipants?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptionalNotNull()
  @IsInt()
  @Min(1)
  @Max(EVENT_MAX_PARTICIPANTS)
  maxParticipants?: number;
}
