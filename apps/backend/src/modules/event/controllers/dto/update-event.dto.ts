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
} from 'class-validator';
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_PARTICIPANTS,
  EVENT_TITLE_MAX_LENGTH,
} from './create-event.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * PATCH /events/:id (B-028, #41): the fields the form lets the organizer
 * change. Not the activity nor the way of joining (design decision for
 * D-02): sending them is a 400 thanks to `forbidNonWhitelisted`. Rules that
 * need the stored event (max ≥ min, max ≥ approved, a future start) are the
 * service's.
 */
export class UpdateEventDto {
  @ApiPropertyOptional({ maxLength: EVENT_TITLE_MAX_LENGTH })
  @IsOptional()
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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ maxLength: EVENT_ADDRESS_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_ADDRESS_MAX_LENGTH)
  address?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  startsAt?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(EVENT_MAX_PARTICIPANTS)
  minParticipants?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(EVENT_MAX_PARTICIPANTS)
  maxParticipants?: number;
}
