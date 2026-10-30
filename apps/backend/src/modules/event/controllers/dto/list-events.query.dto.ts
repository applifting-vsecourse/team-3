import {
  CAPACITY_FILTERS,
  CapacityFilter,
} from '@/modules/event/domain/capacity';
import {
  PUBLIC_EVENT_SORTS,
  PublicEventSort,
} from '@/modules/event/domain/event';
import { PUBLIC_EVENTS_LIMIT } from '@/modules/event/services/events.service';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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
    enum: CAPACITY_FILTERS,
    description:
      'free: not full yet; missing: still missing people to reach the minimum (a subset of free)',
  })
  @IsOptional()
  @IsIn(CAPACITY_FILTERS)
  capacity?: CapacityFilter;

  @ApiPropertyOptional({
    enum: PUBLIC_EVENT_SORTS,
    default: 'date',
    description:
      'date: soonest first; popular: the most interest first – people with a place plus requests waiting for the organizer – and equal interest soonest first (#156)',
  })
  @IsOptional()
  @IsIn(PUBLIC_EVENT_SORTS)
  sort?: PublicEventSort;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PUBLIC_EVENTS_LIMIT,
    default: PUBLIC_EVENTS_LIMIT,
    description: 'At most this many events, e.g. 6 for the landing page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_EVENTS_LIMIT)
  limit?: number;
}
