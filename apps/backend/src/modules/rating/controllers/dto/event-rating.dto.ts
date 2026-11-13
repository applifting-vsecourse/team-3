import {
  EVENT_RATING_SHOWN_REFUSALS,
  EventRating,
  EventRatingRefusal,
  MyEventRating,
  RATING_STARS_MAX,
  RATING_STARS_MIN,
} from '@/modules/rating/domain/event-rating';
import { RATING_COMMENT_MAX_LENGTH } from '@/modules/rating/domain/participant-rating';
import { RATING_WINDOW_DAYS } from '@/modules/rating/domain/rating-window';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// trimmed; nothing left means no comment
const trimToNull = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const STARS_MESSAGE = `Vyber ${RATING_STARS_MIN} až ${RATING_STARS_MAX} hvězdiček`;

/** PUT /events/:id/rating — „Ohodnoť akci“ (Figma C-03). */
export class RateEventDto {
  @ApiProperty({
    minimum: RATING_STARS_MIN,
    maximum: RATING_STARS_MAX,
    example: 5,
  })
  @IsInt({ message: STARS_MESSAGE })
  @Min(RATING_STARS_MIN, { message: STARS_MESSAGE })
  @Max(RATING_STARS_MAX, { message: STARS_MESSAGE })
  eventStars!: number;

  @ApiProperty({
    minimum: RATING_STARS_MIN,
    maximum: RATING_STARS_MAX,
    description:
      'The organizer: the person, or the group for an event of a group',
    example: 4,
  })
  @IsInt({ message: STARS_MESSAGE })
  @Min(RATING_STARS_MIN, { message: STARS_MESSAGE })
  @Max(RATING_STARS_MAX, { message: STARS_MESSAGE })
  organizerStars!: number;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    maxLength: RATING_COMMENT_MAX_LENGTH,
    description:
      'Optional, trimmed; blank means none. Replaces the earlier comment.',
    example: 'Skvělá parta, příště zase.',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: 'Komentář musí být text' })
  @MaxLength(RATING_COMMENT_MAX_LENGTH, {
    message: `Komentář může mít nejvýš ${RATING_COMMENT_MAX_LENGTH} znaků`,
  })
  comment?: string | null;
}

export class EventRatingDto {
  @ApiProperty({ example: 5 })
  eventStars!: number;

  @ApiProperty({ example: 4 })
  organizerStars!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Skvělá parta, příště zase.',
  })
  comment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  static fromDomain({
    eventStars,
    organizerStars,
    comment,
    updatedAt,
  }: EventRating): EventRatingDto {
    return { eventStars, organizerStars, comment, updatedAt };
  }
}

/** GET and PUT /events/:id/rating — the participant's own rating. */
export class MyEventRatingResponseDto {
  @ApiProperty({
    type: EventRatingDto,
    nullable: true,
    description: 'Null before rating, and after a superadmin deleted it',
  })
  rating!: EventRatingDto | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: `The last moment to rate: the end (23:59:59.999 in Prague) of the ${RATING_WINDOW_DAYS}th Prague calendar day after the day the event ended (started, without an end)`,
  })
  ratableUntil!: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    // the same list the service keeps out of 403 (EVENT_RATING_FORBIDDEN)
    enum: EVENT_RATING_SHOWN_REFUSALS,
    description: 'Why rating is not possible now; null when it is',
  })
  refusal!: EventRatingRefusal | null;

  static fromDomain({
    rating,
    ratableUntil,
    refusal,
  }: MyEventRating): MyEventRatingResponseDto {
    return {
      rating: rating ? EventRatingDto.fromDomain(rating) : null,
      ratableUntil,
      refusal,
    };
  }
}
