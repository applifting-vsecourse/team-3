import { LocalityResponseDto } from '@/modules/catalog/controllers/dto/locality.response.dto';
import type {
  ProfileEvent,
  ProfileOverview,
  ProfileRating,
  SelfProfile,
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
  @ApiProperty({ type: [ProfileEventResponseDto] }) organizing!: ProfileEvent[];
  @ApiProperty({ type: [ProfileEventResponseDto] }) upcoming!: ProfileEvent[];
  @ApiProperty({ type: [ProfileEventResponseDto] }) past!: ProfileEvent[];
  @ApiProperty({ type: [ProfileRatingResponseDto] })
  participantRatings!: ProfileRating[];
  @ApiProperty({ type: [ProfileRatingResponseDto] })
  organizerRatings!: ProfileRating[];
  @ApiProperty({ type: ProfileRatingSummaryDto })
  participantSummary!: RatingSummary;
  @ApiProperty({ type: ProfileRatingSummaryDto })
  organizerSummary!: RatingSummary;
}
