import { FRIENDSHIP_STATES } from '@/modules/friendship/controllers/dto/friendship.dto';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import { MUTUAL_FRIENDS_SHOWN_FROM } from '@/modules/friendship/domain/mutual-friends';
import {
  dailyRequestLimit,
  MAX_DAILY_REQUEST_LIMIT,
  REQUEST_PLANS,
  type FriendRequestLimit,
  type RequestPlan,
} from '@/modules/friendship/domain/request-limit';
import {
  DEFAULT_PARTNER_RADIUS_KM,
  PARTNER_DISTANCE_BANDS_KM,
  PARTNER_PAGE_SIZE,
  PARTNER_RADII_KM,
  type PartnerActivity,
  type PartnerDistanceBand,
  type PartnerRadiusKm,
  type PartnerSuggestion,
} from '@/modules/partner/domain/partner-suggestions';
import type {
  PartnerRequestResult,
  PartnerSetupGap,
  PartnerSuggestions,
} from '@/modules/partner/services/partner.service';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, Matches } from 'class-validator';

/** GET /api/partners/suggestions: the radius and where the previous page ended. */
export class PartnerSuggestionsQueryDto {
  @ApiPropertyOptional({
    enum: PARTNER_RADII_KM,
    default: DEFAULT_PARTNER_RADIUS_KM,
    description:
      'How far from my home locality, in km; „Hledat do 25 km“ steps 10 → 25 → 50',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(PARTNER_RADII_KM)
  radiusKm?: PartnerRadiusKm;

  @ApiPropertyOptional({
    description:
      'nextCursor of the previous page, as given; without it the deck starts from the best fit',
  })
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{1,300}$/)
  cursor?: string;
}

class PartnerActivityDto implements PartnerActivity {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Deskové hry' }) name!: string;
  @ApiProperty({
    example: 'deskove-hry',
    description: 'For the card’s photo, as the onboarding’s cards',
  })
  slug!: string;
}

class PartnerSuggestionDto implements PartnerSuggestion {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'As on the public profile' }) name!: string;
  @ApiProperty({
    enum: PARTNER_DISTANCE_BANDS_KM,
    description:
      'The band the distance between the two home localities (their centres) falls in, rounded up: do 2 km, asi 5 / 10 / 25 km, do 50 km. Never coordinates or the locality itself.',
  })
  distanceBandKm!: PartnerDistanceBand;
  @ApiProperty({
    type: [PartnerActivityDto],
    description: 'Oba vás baví: activities we both like, in Czech order',
  })
  sharedInterests!: PartnerActivity[];
  @ApiProperty({
    type: [PartnerActivityDto],
    description: 'Their other interests, in Czech order',
  })
  otherInterests!: PartnerActivity[];
  @ApiProperty({
    description:
      'Posílá ti žádost: their friendship request waits for me, so Přidat is a match',
  })
  hasRequestedMe!: boolean;
  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: MUTUAL_FRIENDS_SHOWN_FROM,
    example: 3,
    description: `Společní přátelé: how many of my friends (accepted, active accounts) are their friends too — never who. Null below ${MUTUAL_FRIENDS_SHOWN_FROM}, so a count of 1 never gives a friendship away (#473). Not a sort key.`,
  })
  mutualFriendsCount!: number | null;
}

/** Today's limit of new friendship requests (#84, #473). */
class FriendRequestLimitDto implements FriendRequestLimit {
  @ApiProperty({
    minimum: 0,
    maximum: MAX_DAILY_REQUEST_LIMIT,
    description: 'Přidat left today; accepting a request is always possible',
  })
  left!: number;
  @ApiProperty({
    example: dailyRequestLimit('free'),
    description: `New requests a day on the plan (free ${dailyRequestLimit('free')}, plus ${dailyRequestLimit('plus')})`,
  })
  perDay!: number;
  @ApiProperty({
    format: 'date-time',
    example: '2026-11-28T23:00:00.000Z',
    description: 'The next Prague midnight, when left is perDay again',
  })
  resetsAt!: string;
  @ApiProperty({
    enum: REQUEST_PLANS,
    description:
      'The plan the limit comes from; free for everybody until the paid plan (B-071)',
  })
  plan!: RequestPlan;
}

/** One page of the deck (#84): who already asks me first, then the best fit. */
export class PartnerSuggestionsResponseDto implements PartnerSuggestions {
  @ApiProperty({
    type: [PartnerSuggestionDto],
    description: `At most ${PARTNER_PAGE_SIZE}: verified people with the onboarding done and discoverable, within the radius, sharing an activity, not friends, not asked by me and not skipped in the last 90 days`,
  })
  items!: PartnerSuggestion[];
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'For the next page; null once nobody else is in the radius',
  })
  nextCursor!: string | null;
  @ApiProperty({ enum: PARTNER_RADII_KM }) radiusKm!: PartnerRadiusKm;
  @ApiProperty({
    enum: ['onboarding', 'locality', 'interests'],
    isArray: true,
    description:
      'What my profile still lacks before anyone can be suggested; empty when the deck could be built',
  })
  missing!: PartnerSetupGap[];
  @ApiProperty({
    description:
      'Ukazovat mě v Najdi parťáka is off: who isn’t seen sees nobody either (as Bumble’s Snooze), so items are empty',
  })
  hidden!: boolean;
  @ApiProperty({ type: FriendRequestLimitDto })
  limit!: FriendRequestLimit;
}

/** POST /api/partners/:userId/request: the friendship after „Přidat“. */
export class PartnerRequestResponseDto implements PartnerRequestResult {
  @ApiProperty({
    enum: FRIENDSHIP_STATES,
    description:
      'friends = Je to shoda! (their request waited for me); outgoing = my request waits for them',
  })
  state!: FriendshipState;
  @ApiProperty({
    type: FriendRequestLimitDto,
    description: 'Today’s limit after this request',
  })
  limit!: FriendRequestLimit;
}
