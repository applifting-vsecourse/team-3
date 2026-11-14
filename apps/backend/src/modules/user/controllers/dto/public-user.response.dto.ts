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
class PublicPlaceDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
}
class PublicCategoryDto extends PublicPlaceDto {
  @ApiProperty({ description: 'Icon name of the category (Activity tile)' })
  icon!: string;
}
class PublicActivityDto extends PublicPlaceDto {
  @ApiProperty({ type: PublicCategoryDto }) category!: PublicCategoryDto;
}
class PublicOrganizedEventDto implements PublicOrganizedEvent {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() startsAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) endsAt!: Date | null;
  @ApiProperty() localityName!: string;
  @ApiProperty() activityName!: string;
  @ApiProperty({ example: 'Hala Strahov, Vaníčkova 2, Praha 6' })
  address!: string;
  @ApiProperty({ type: PublicPlaceDto })
  locality!: PublicOrganizedEvent['locality'];
  @ApiProperty({ type: PublicActivityDto })
  activity!: PublicOrganizedEvent['activity'];
  @ApiProperty({ minimum: 0 }) approvedCount!: number;
  @ApiProperty({
    minimum: 1,
    description: 'Below it the event did not take place (Nekonalo se).',
  })
  minParticipants!: number;
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
