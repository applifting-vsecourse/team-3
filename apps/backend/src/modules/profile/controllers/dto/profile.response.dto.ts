import { LocalityResponseDto } from '@/modules/catalog/controllers/dto/locality.response.dto';
import {
  PROFILE_OVERVIEW_TAKE,
  type ProfileEvent,
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
  @ApiProperty({ type: LocalityResponseDto, nullable: true })
  homeLocality!: SelfProfile['homeLocality'];
  @ApiProperty({ type: [NamedProfileEntityDto] })
  interests!: SelfProfile['interests'];
}
class ProfileEventResponseDto implements ProfileEvent {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() startsAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) endsAt!: Date | null;
  @ApiProperty({ enum: ['published', 'cancelled'] })
  status!: ProfileEvent['status'];
  @ApiProperty() localityName!: string;
  @ApiProperty({ enum: ['approved', 'pending'], nullable: true })
  participation!: ProfileEvent['participation'];
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
export class ProfileOverviewResponseDto implements ProfileOverview {
  @ApiProperty({
    type: [ProfileEventResponseDto],
    description: `Events I organize, latest first; at most ${PROFILE_OVERVIEW_TAKE}`,
  })
  organizing!: ProfileEvent[];
  @ApiProperty({ description: 'How many events I organize in all' })
  organizingTotal!: number;
  @ApiProperty({
    type: [ProfileEventResponseDto],
    description: `Upcoming events I go to or wait for, soonest first; at most ${PROFILE_OVERVIEW_TAKE}`,
  })
  upcoming!: ProfileEvent[];
  @ApiProperty({ description: 'How many upcoming events in all' })
  upcomingTotal!: number;
  @ApiProperty({
    type: [ProfileEventResponseDto],
    description: `Past events I took part in, latest first; at most ${PROFILE_OVERVIEW_TAKE}`,
  })
  past!: ProfileEvent[];
  @ApiProperty({ description: 'How many past events in all' })
  pastTotal!: number;
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
}
