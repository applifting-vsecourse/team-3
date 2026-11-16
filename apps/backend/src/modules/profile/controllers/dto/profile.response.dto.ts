import { LocalityResponseDto } from '@/modules/catalog/controllers/dto/locality.response.dto';
import { PublicEventResponseDto } from '@/modules/event/controllers/dto/public-event.response.dto';
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
/** An event as in GET /api/events (for the event cards) and my place in it. */
class ProfileEventResponseDto extends PublicEventResponseDto {
  @ApiProperty({ enum: ['published', 'cancelled'] })
  status!: ProfileEvent['status'];
  @ApiProperty() localityName!: string;
  @ApiProperty({ enum: ['approved', 'pending'], nullable: true })
  participation!: ProfileEvent['participation'];

  static fromProfileEvent(event: ProfileEvent): ProfileEventResponseDto {
    return {
      ...PublicEventResponseDto.fromDomain(event),
      status: event.status,
      localityName: event.localityName,
      participation: event.participation,
    };
  }
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
export class ProfileOverviewResponseDto {
  @ApiProperty({
    type: [ProfileEventResponseDto],
    description: `Events I organize that are not over yet (one going on right now too), cancelled ones with their status, soonest first; at most ${PROFILE_OVERVIEW_TAKE}`,
  })
  organizing!: ProfileEventResponseDto[];
  @ApiProperty({ description: 'How many events I organize in all' })
  organizingTotal!: number;
  @ApiProperty({
    type: [ProfileEventResponseDto],
    description: `Events I go to or wait for that are not over yet – one going on right now too, where joining or leaving is no longer possible (#272) – cancelled ones with their status, soonest first; at most ${PROFILE_OVERVIEW_TAKE}`,
  })
  upcoming!: ProfileEventResponseDto[];
  @ApiProperty({ description: 'How many of them in all (`upcoming`)' })
  upcomingTotal!: number;
  @ApiProperty({
    type: [ProfileEventResponseDto],
    description: `Events that are over where I had an approved place, latest first; cancelled ones too, with \`status: cancelled\` – they didn't take place and can't be rated (#272); at most ${PROFILE_OVERVIEW_TAKE}`,
  })
  past!: ProfileEventResponseDto[];
  @ApiProperty({
    description:
      'How many of them in all (`past`), cancelled ones included: what the section lists, not how many events I attended',
  })
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

  static fromDomain(overview: ProfileOverview): ProfileOverviewResponseDto {
    const events = (list: ProfileEvent[]): ProfileEventResponseDto[] =>
      list.map((event) => ProfileEventResponseDto.fromProfileEvent(event));
    return {
      ...overview,
      organizing: events(overview.organizing),
      upcoming: events(overview.upcoming),
      past: events(overview.past),
    };
  }
}
