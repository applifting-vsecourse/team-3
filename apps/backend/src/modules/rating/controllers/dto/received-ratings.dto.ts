import {
  ReceivedRating,
  ReceivedRatings,
} from '@/modules/rating/domain/received-ratings';
import { ApiProperty } from '@nestjs/swagger';

class RatingSummaryDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Rounded to one decimal; null without ratings, not 0',
    example: 4.5,
  })
  average!: number | null;

  @ApiProperty({ example: 6 })
  count!: number;
}

class ReceivedSummaryDto {
  @ApiProperty({ type: RatingSummaryDto })
  event!: RatingSummaryDto;

  @ApiProperty({
    type: RatingSummaryDto,
    description: 'For an event of a group, the stars belong to the group',
  })
  organizer!: RatingSummaryDto;
}

class RatingAuthorDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Jakub Král' }) name!: string;
}

export class ReceivedRatingDto {
  @ApiProperty({ type: RatingAuthorDto })
  author!: RatingAuthorDto;

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

  static fromDomain(rating: ReceivedRating): ReceivedRatingDto {
    return {
      author: { id: rating.author.id, name: rating.author.name },
      eventStars: rating.eventStars,
      organizerStars: rating.organizerStars,
      comment: rating.comment,
      updatedAt: rating.updatedAt,
    };
  }
}

/** GET /events/:id/ratings — what the event got from its participants (B-060). */
export class ReceivedRatingsResponseDto {
  @ApiProperty({ type: ReceivedSummaryDto })
  summary!: ReceivedSummaryDto;

  @ApiProperty({
    type: [ReceivedRatingDto],
    description: 'Newest first, without the ones a superadmin deleted',
  })
  ratings!: ReceivedRatingDto[];

  static fromDomain({
    summary,
    ratings,
  }: ReceivedRatings): ReceivedRatingsResponseDto {
    return {
      summary: {
        event: { ...summary.event },
        organizer: { ...summary.organizer },
      },
      ratings: ratings.map(ReceivedRatingDto.fromDomain),
    };
  }
}
