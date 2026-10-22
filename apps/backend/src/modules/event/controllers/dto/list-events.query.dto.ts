import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// YYYY-MM-DD strings compare in date order, no parsing needed.
@ValidatorConstraint({ name: 'notBeforeDateFrom' })
class NotBeforeDateFrom implements ValidatorConstraintInterface {
  validate(dateTo: string, args: ValidationArguments): boolean {
    const { dateFrom } = args.object as ListEventsQueryDto;
    return dateFrom === undefined || dateTo >= dateFrom;
  }

  defaultMessage(): string {
    return 'dateTo must not be before dateFrom';
  }
}

// `?activityId=a` arrives as a string, `?activityId=a&activityId=b` as an array.
const toArray = ({ value }: TransformFnParams): unknown =>
  value === undefined || Array.isArray(value) ? value : [value];

// Anything other than true/false/1/0 is left as is, so IsBoolean rejects it.
const toBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

export class ListEventsQueryDto {
  @ApiPropertyOptional({
    description:
      'A city includes all its districts, a district only itself (GET /localities)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;

  @ApiPropertyOptional({
    example: '2026-10-24',
    description: 'First day, inclusive; a calendar day in Prague time',
  })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'dateFrom must be YYYY-MM-DD' })
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-10-25',
    description: 'Last day, inclusive; a calendar day in Prague time',
  })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'dateTo must be YYYY-MM-DD' })
  @IsDateString({ strict: true })
  @Validate(NotBeforeDateFrom)
  dateTo?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Repeat the key for more (activityId=a&activityId=b, not activityId[]); adds up with categoryId (OR)',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  activityId?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Whole category incl. activities added later. Repeat the key for more; adds up with activityId (OR)',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  categoryId?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Only events that still miss people to reach the minimum',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  missingOnly?: boolean;
}
