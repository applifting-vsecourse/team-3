import { EVENT_MAX_PARTICIPANTS } from '@/modules/event/controllers/dto/create-event.dto';
import {
  RATING_STARS_MAX,
  RATING_STARS_MIN,
} from '@/modules/rating/domain/event-rating';
import {
  EVENT_NOT_RATABLE,
  EventNotRatable,
  GivenParticipantRating,
  ParticipantRatings,
  RatedParticipant,
  RATING_COMMENT_MAX_LENGTH,
} from '@/modules/rating/domain/participant-rating';
import { RATING_WINDOW_DAYS } from '@/modules/rating/domain/rating-window';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// trimmed; nothing left means no comment
const trimToNull = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const STARS_MESSAGE = `Vyber ${RATING_STARS_MIN} až ${RATING_STARS_MAX} hvězdiček`;

/** One participant's rating from the organizer. */
export class ParticipantRatingItemDto {
  @ApiProperty({ description: "The participant's user id" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  participantId!: string;

  @ApiProperty({
    minimum: RATING_STARS_MIN,
    maximum: RATING_STARS_MAX,
    example: 5,
  })
  @IsInt({ message: STARS_MESSAGE })
  @Min(RATING_STARS_MIN, { message: STARS_MESSAGE })
  @Max(RATING_STARS_MAX, { message: STARS_MESSAGE })
  stars!: number;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    maxLength: RATING_COMMENT_MAX_LENGTH,
    description:
      "Optional, trimmed; blank means none. Replaces the earlier comment. Shown on the participant's public profile.",
    example: 'Díky za pomoc se sítí.',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: 'Komentář musí být text' })
  @MaxLength(RATING_COMMENT_MAX_LENGTH, {
    message: `Komentář může mít nejvýš ${RATING_COMMENT_MAX_LENGTH} znaků`,
  })
  comment?: string | null;
}

/**
 * PUT /events/:id/participant-ratings — „Ohodnoť účastníky“ (Figma D-05):
 * one participant, or all of them with what „Všem stejně“ filled in.
 */
export class RateParticipantsDto {
  @ApiProperty({
    type: [ParticipantRatingItemDto],
    minItems: 1,
    maxItems: EVENT_MAX_PARTICIPANTS,
    description: 'Each participant at most once; saved all or none',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(EVENT_MAX_PARTICIPANTS)
  @ArrayUnique((item: ParticipantRatingItemDto) => item?.participantId, {
    message: 'Každého účastníka jde v jednom uložení hodnotit jen jednou',
  })
  @ValidateNested({ each: true })
  @Type(() => ParticipantRatingItemDto)
  ratings!: ParticipantRatingItemDto[];
}

export class GivenParticipantRatingDto {
  @ApiProperty({ example: 5 })
  stars!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Díky za pomoc se sítí.',
  })
  comment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  static fromDomain({
    stars,
    comment,
    updatedAt,
  }: GivenParticipantRating): GivenParticipantRatingDto {
    return { stars, comment, updatedAt };
  }
}

export class RatedParticipantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Jakub Král' })
  name!: string;

  @ApiProperty({
    type: GivenParticipantRatingDto,
    nullable: true,
    description: 'Null before rating, and after a superadmin deleted it',
  })
  rating!: GivenParticipantRatingDto | null;

  @ApiProperty({
    description: "A superadmin deleted the rating; it can't be given again",
  })
  ratingDeleted!: boolean;

  static fromDomain({
    id,
    name,
    rating,
    ratingDeleted,
  }: RatedParticipant): RatedParticipantDto {
    return {
      id,
      name,
      rating: rating ? GivenParticipantRatingDto.fromDomain(rating) : null,
      ratingDeleted,
    };
  }
}

/** GET and PUT /events/:id/participant-ratings — the organizer's view. */
export class ParticipantRatingsResponseDto {
  @ApiProperty({
    type: [RatedParticipantDto],
    description:
      'Approved participants in the order they got their place, without the organizer',
  })
  participants!: RatedParticipantDto[];

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: `${RATING_WINDOW_DAYS} days after the end of the event (its start without one)`,
  })
  ratableUntil!: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    // what eventNotRatable can return, the same constant
    enum: EVENT_NOT_RATABLE,
    description: 'Why nobody can be rated now; null when they can',
  })
  refusal!: EventNotRatable | null;

  static fromDomain({
    participants,
    ratableUntil,
    refusal,
  }: ParticipantRatings): ParticipantRatingsResponseDto {
    return {
      participants: participants.map(RatedParticipantDto.fromDomain),
      ratableUntil,
      refusal,
    };
  }
}
