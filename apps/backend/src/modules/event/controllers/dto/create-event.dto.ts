import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
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
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const EVENT_TITLE_MAX_LENGTH = 120;
export const EVENT_DESCRIPTION_MAX_LENGTH = 2000;
export const EVENT_ADDRESS_MAX_LENGTH = 200;
export const EVENT_MAX_PARTICIPANTS = 500;
export const APPROVAL_MODES = ['open', 'approval'] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@ValidatorConstraint({ name: 'maxNotBelowMin' })
class MaxNotBelowMin implements ValidatorConstraintInterface {
  validate(max: number, args: ValidationArguments): boolean {
    const { minParticipants } = args.object as CreateEventDto;
    return typeof minParticipants !== 'number' || max >= minParticipants;
  }

  defaultMessage(): string {
    return 'maxParticipants must not be lower than minParticipants';
  }
}

@ValidatorConstraint({ name: 'endsAfterStart' })
class EndsAfterStart implements ValidatorConstraintInterface {
  validate(endsAt: string, args: ValidationArguments): boolean {
    const { startsAt } = args.object as CreateEventDto;
    return !startsAt || new Date(endsAt) > new Date(startsAt);
  }

  defaultMessage(): string {
    return 'endsAt must be after startsAt';
  }
}

/**
 * validator.js's ISO 8601 also takes week dates („2027-W10-3“) and a decimal
 * comma („…T18:00:00,5Z“), which `new Date` can't read: such a date reached
 * the database as an Invalid Date and failed with a 500 instead of a 400.
 */
@ValidatorConstraint({ name: 'parsableDate' })
export class ParsableDate implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a date and time like 2026-11-02T17:00:00Z`;
  }
}

/**
 * POST /events (B-021). The organizer is never part of the body: it is the
 * signed-in user, and the controller's `forbidNonWhitelisted` turns an
 * `organizerUserId` here into a 400.
 */
export class CreateEventDto {
  @ApiProperty({ maxLength: EVENT_TITLE_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_TITLE_MAX_LENGTH)
  title!: string;

  @ApiPropertyOptional({ maxLength: EVENT_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(EVENT_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiProperty({ description: 'An activity from GET /activities' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  activityId!: string;

  @ApiProperty({ description: 'A locality from GET /localities' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId!: string;

  // IsLatitude/IsLongitude also accept a numeric string, which the database
  // would refuse with a 500; a number is required
  @ApiProperty({ example: 50.0928, description: 'The place picked on the map' })
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 14.4508 })
  @IsNumber()
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 'Herna Karlín, Křižíkova 52, Praha 8' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_ADDRESS_MAX_LENGTH)
  address!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Must be in the future',
  })
  @IsDateString({ strict: true })
  @Validate(ParsableDate)
  startsAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Validate(ParsableDate)
  @Validate(EndsAfterStart)
  endsAt?: string;

  @ApiProperty({ minimum: 1, example: 4 })
  @IsInt()
  @Min(1)
  @Max(EVENT_MAX_PARTICIPANTS)
  minParticipants!: number;

  @ApiProperty({ minimum: 1, example: 8 })
  @IsInt()
  @Min(1)
  @Max(EVENT_MAX_PARTICIPANTS)
  @Validate(MaxNotBelowMin)
  maxParticipants!: number;

  @ApiProperty({
    enum: APPROVAL_MODES,
    description: 'open: joining is immediate; approval: the organizer approves',
  })
  @IsIn(APPROVAL_MODES)
  approvalMode!: (typeof APPROVAL_MODES)[number];
}
