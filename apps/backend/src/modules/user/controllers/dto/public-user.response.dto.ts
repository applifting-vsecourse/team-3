import type { RatingSummary } from '@/modules/rating/domain/rating-summary';
import type {
  PublicOrganizedEvent,
  PublicReceivedRating,
  PublicUserProfile,
} from '@/modules/user/domain/public-profile';
import { ApiProperty } from '@nestjs/swagger';

class PublicPersonDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}
class PublicEventReferenceDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
}
class PublicRatingSummaryDto implements RatingSummary {
  @ApiProperty({ type: Number, nullable: true }) average!: number | null;
  @ApiProperty() count!: number;
}
class PublicReceivedRatingDto implements PublicReceivedRating {
  @ApiProperty() id!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) stars!: number;
  @ApiProperty({ type: String, nullable: true }) comment!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: PublicPersonDto, nullable: true })
  author!: PublicReceivedRating['author'];
  @ApiProperty({
    type: PublicEventReferenceDto,
    description:
      'Always a public event: ratings from private or members-only events are not listed, they count only in participantSummary',
  })
  event!: PublicReceivedRating['event'];
}
class PublicOrganizedEventDto implements PublicOrganizedEvent {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() startsAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) endsAt!: Date | null;
  @ApiProperty() localityName!: string;
  @ApiProperty() activityName!: string;
  @ApiProperty({ minimum: 0 }) approvedCount!: number;
  @ApiProperty({ type: PublicRatingSummaryDto }) rating!: RatingSummary;
}
export class PublicUserResponseDto
  extends PublicPersonDto
  implements PublicUserProfile
{
  @ApiProperty({ type: [PublicPersonDto] })
  interests!: PublicUserProfile['interests'];
  @ApiProperty({ type: PublicRatingSummaryDto })
  participantSummary!: RatingSummary;
  @ApiProperty({ type: PublicRatingSummaryDto })
  organizerSummary!: RatingSummary;
  @ApiProperty({ type: PublicRatingSummaryDto }) eventSummary!: RatingSummary;
  @ApiProperty({ type: [PublicReceivedRatingDto] })
  participantRatings!: PublicReceivedRating[];
  @ApiProperty({ type: [PublicOrganizedEventDto] })
  organizedEvents!: PublicOrganizedEvent[];
}
