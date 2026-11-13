import {
  BBOX_PATTERN,
  parseBoundingBox,
} from '@/modules/event/domain/bounding-box';
import {
  CAPACITY_FILTERS,
  CapacityFilter,
} from '@/modules/event/domain/capacity';
import {
  PUBLIC_EVENT_SORTS,
  PublicEventFilters,
  PublicEventSort,
} from '@/modules/event/domain/event';
import { PUBLIC_EVENTS_LIMIT } from '@/modules/event/services/events.service';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
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

@ValidatorConstraint({ name: 'boundingBox' })
class IsBoundingBox implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return parseBoundingBox(value) !== undefined;
  }

  defaultMessage(): string {
    return 'bbox must be west,south,east,north in degrees, west < east and south < north';
  }
}

// lat and lng come together; radiusKm and sort=distance need them (#57)
@ValidatorConstraint({ name: 'needsPoint' })
class NeedsPoint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const { lat, lng } = args.object as ListEventsQueryDto;
    return lat !== undefined && lng !== undefined;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} needs both lat and lng`;
  }
}

@ValidatorConstraint({ name: 'distanceNeedsPoint' })
class DistanceNeedsPoint implements ValidatorConstraintInterface {
  validate(sort: string, args: ValidationArguments): boolean {
    const { lat, lng } = args.object as ListEventsQueryDto;
    return sort !== 'distance' || (lat !== undefined && lng !== undefined);
  }

  defaultMessage(): string {
    return 'sort=distance needs both lat and lng';
  }
}

// `?past=true` arrives as a string; anything else than true/false is a 400
const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

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
    example: '14.3,50.0,14.6,50.15',
    description:
      'The visible area of the map, west,south,east,north (GeoJSON order): only events placed inside it („Hledat v této oblasti“)',
  })
  @IsOptional()
  @Matches(BBOX_PATTERN, { message: 'bbox must be four numbers' })
  @Validate(IsBoundingBox)
  bbox?: string;

  @ApiPropertyOptional({
    example: 'volejbal letna',
    description:
      'Words found in the title, the activity name or its keywords, ignoring case and diacritics; all of them (#57)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    example: 50.1103,
    description:
      'With lng: the point distances are measured from (the centre of the chosen locality, #57); events then have distanceKm',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Validate(NeedsPoint)
  lat?: number;

  @ApiPropertyOptional({ example: 14.4734, description: 'With lat' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Validate(NeedsPoint)
  lng?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    example: 10,
    description:
      'Only events at most this many km from lat,lng („okolí +10 km“, #57); /akce sends it instead of localityId',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @Validate(NeedsPoint)
  radiusKm?: number;

  @ApiPropertyOptional({
    enum: PUBLIC_EVENT_SORTS,
    default: 'date',
    description:
      'date: soonest first; popular: the most interest first – people with a place plus requests waiting for the organizer – and equal interest soonest first (#156); distance: the nearest to lat,lng first, needs them (#57)',
  })
  @IsOptional()
  @IsIn(PUBLIC_EVENT_SORTS)
  @Validate(DistanceNeedsPoint)
  sort?: PublicEventSort;

  @ApiPropertyOptional({
    description:
      'Proběhlé (#61): public events that are over instead of the upcoming ones – after their end, without one after the Prague day they start on (#272) – newest first, each with its average rating. Cancelled events are never listed. It replaces the date range, so dateFrom and dateTo are ignored, and capacity too: a past event has no places left to fill.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  past?: boolean;

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

/** The domain filters of a list query; GET /events and GET /home/events read it alike. */
export const toPublicEventFilters = (
  query: ListEventsQueryDto,
): PublicEventFilters => ({
  localityId: query.localityId,
  dateFrom: query.dateFrom,
  dateTo: query.dateTo,
  activityIds: query.activityId,
  categoryIds: query.categoryId,
  capacity: query.capacity,
  bbox: query.bbox ? parseBoundingBox(query.bbox) : undefined,
  q: query.q,
  point:
    query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng }
      : undefined,
  radiusKm: query.radiusKm,
  past: query.past,
});
