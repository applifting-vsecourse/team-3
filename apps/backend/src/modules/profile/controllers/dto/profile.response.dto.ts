import { LocalityResponseDto } from '@/modules/catalog/controllers/dto/locality.response.dto';
import {
  PROFILE_OVERVIEW_TAKE,
  type ProfileOverview,
  type ProfileRating,
  type SelfProfile,
} from '@/modules/profile/domain/profile';
import type { RatingSummary } from '@/modules/rating/domain/rating-summary';
import { ApiProperty } from '@nestjs/swagger';

class NamedProfileEntityDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}
class ProfileEventReferenceDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
}
export class SelfProfileResponseDto implements SelfProfile {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty() hasPassword!: boolean;
  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;
  @ApiProperty({ type: LocalityResponseDto, nullable: true })
  homeLocality!: SelfProfile['homeLocality'];
  @ApiProperty({ type: [NamedProfileEntityDto] })
  interests!: SelfProfile['interests'];
}
class ProfileRatingResponseDto implements ProfileRating {
  @ApiProperty() id!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) stars!: number;
  @ApiProperty({ type: String, nullable: true }) comment!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: ProfileEventReferenceDto })
  event!: ProfileRating['event'];
  @ApiProperty({ type: NamedProfileEntityDto })
  author!: ProfileRating['author'];
}
class ProfileRatingSummaryDto implements RatingSummary {
  @ApiProperty({ type: Number, nullable: true }) average!: number | null;
  @ApiProperty() count!: number;
}
/** The ratings; my events are in Moje, GET /api/me/events (#367). */
export class ProfileOverviewResponseDto implements ProfileOverview {
  @ApiProperty({
    type: [ProfileRatingResponseDto],
    description: `Latest ratings as a participant; at most ${PROFILE_OVERVIEW_TAKE}, all of them in participantSummary.count`,
  })
  participantRatings!: ProfileRating[];
  @ApiProperty({
    type: [ProfileRatingResponseDto],
    description: `Latest ratings as an organizer; at most ${PROFILE_OVERVIEW_TAKE}, all of them in organizerSummary.count`,
  })
  organizerRatings!: ProfileRating[];
  @ApiProperty({
    type: ProfileRatingSummaryDto,
    description: 'Average and count of all ratings as a participant',
  })
  participantSummary!: RatingSummary;
  @ApiProperty({
    type: ProfileRatingSummaryDto,
    description: 'Average and count of all ratings as an organizer',
  })
  organizerSummary!: RatingSummary;

  static fromDomain(overview: ProfileOverview): ProfileOverviewResponseDto {
    return {
      participantRatings: overview.participantRatings,
      organizerRatings: overview.organizerRatings,
      participantSummary: overview.participantSummary,
      organizerSummary: overview.organizerSummary,
    };
  }
}
