import { PublicEventResponseDto } from '@/modules/event/controllers/dto/public-event.response.dto';
import { FRIENDSHIP_STATES } from '@/modules/friendship/controllers/dto/friendship.dto';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import type { RatingSummary } from '@/modules/rating/domain/rating-summary';
import type {
  PublicOrganizedEvent,
  PublicReceivedRating,
  PublicUserProfile,
} from '@/modules/user/domain/public-profile';
import type { PublicUserView } from '@/modules/user/services/user.service';
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
    minimum: 0,
    description:
      'How many were missing to the minimum; above 0 the event did not take place',
  })
  missingToMin!: number;
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
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'About me (#64); null when empty or when the person does not show it to this viewer (bioVisibility, B-014)',
  })
  bio!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The uploaded photo at GET /api/images/{photoKey} (#64); null when none or not shown to this viewer (photoVisibility)',
  })
  photoKey!: string | null;
  @ApiProperty({
    type: [PublicOrganizedEventDto],
    nullable: true,
    description:
      'Visited events (#64): public, over, with an approved place, organized by someone else; the latest 10. Null when not shown to this viewer (pastEventsVisibility); [] = none yet.',
  })
  pastEvents!: PublicOrganizedEvent[] | null;
  @ApiProperty({
    enum: FRIENDSHIP_STATES,
    nullable: true,
    description:
      'How the signed-in viewer stands to the person (#307): friends; outgoing = my request waits (also after a silent rejection); incoming = theirs waits for me; none; self. Null for a visitor.',
  })
  friendship!: FriendshipState | null;
  @ApiProperty({
    type: [PublicEventResponseDto],
    nullable: true,
    description:
      'Kam jde (#307), for a friend only: at most 3 nearest events that are not over, where the person has an approved place or which they organize, only public ones and members-only ones of a group the viewer is a member of. Null for anyone who is not a friend.',
  })
  upcomingEvents!: PublicEventResponseDto[] | null;

  static fromView(view: PublicUserView): PublicUserResponseDto {
    return {
      ...view,
      upcomingEvents:
        view.upcomingEvents?.map((event) =>
          PublicEventResponseDto.fromDomain(event),
        ) ?? null,
    };
  }
}
