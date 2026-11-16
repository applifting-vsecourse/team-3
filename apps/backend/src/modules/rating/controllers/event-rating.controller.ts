import { RATING_WINDOW_DAYS } from '@/modules/rating/domain/rating-window';
import { RatingService } from '@/modules/rating/services/rating.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MyEventRatingResponseDto, RateEventDto } from './dto/event-rating.dto';
import { ReceivedRatingsResponseDto } from './dto/received-ratings.dto';

// Next to the event's other routes: the page is /akce/:id/hodnoceni (B-060).
@ApiTags('ratings')
@Controller('events')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class EventRatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Get(':id/rating')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      "The participant's rating of the event and its organizer (B-060, #66), and whether they may give or change it",
    description:
      'For an approved participant, not the organizer; membership of the group no longer matters. ' +
      `\`refusal\` says why rating is not possible now (cancelled, not over yet, below its minimum so it didn't take place, deleted by a superadmin, after ${RATING_WINDOW_DAYS} calendar days in Prague).`,
  })
  @ApiResponse({ status: 200, type: MyEventRatingResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'OWN_EVENT (the organizer), or NOT_PARTICIPANT (not approved for the event)',
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  async myRating(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<MyEventRatingResponseDto> {
    return MyEventRatingResponseDto.fromDomain(
      await this.ratingService.getMyEventRating(id, user.id),
    );
  }

  @Get(':id/ratings')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'What the event got from its participants (B-060, #66): both averages and each rating with its comment',
    description:
      'For who manages the event: its organizer or, for an event of a group, an active admin of the group. ' +
      'Newest first, without the ratings a superadmin deleted; an average is null without ratings.',
  })
  @ApiResponse({ status: 200, type: ReceivedRatingsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      "NOT_MANAGER: not the event's organizer nor an admin of its group",
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  async receivedRatings(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<ReceivedRatingsResponseDto> {
    return ReceivedRatingsResponseDto.fromDomain(
      await this.ratingService.getReceivedRatings(id, user.id),
    );
  }

  @Put(':id/rating')
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: `Rate the event and its organizer, or change the rating (B-060, #66); within ${RATING_WINDOW_DAYS} calendar days (Prague) of the end`,
    description:
      'One rating per user and event: the first call gives it, later ones replace it, comment included. ' +
      'For an event of a group the organizer stars count to the group.',
  })
  @ApiResponse({ status: 200, type: MyEventRatingResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Stars not 1–5, or the comment over 500 characters',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'OWN_EVENT, NOT_PARTICIPANT, EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  @ApiResponse({
    status: 409,
    description:
      'EVENT_NOT_PUBLISHED (cancelled), EVENT_NOT_ENDED, EVENT_NOT_HELD (below the minimum), RATING_DELETED or RATING_WINDOW_CLOSED',
  })
  async rate(
    @Param('id') id: string,
    @Body() body: RateEventDto,
    @User() user: Identity,
  ): Promise<MyEventRatingResponseDto> {
    return MyEventRatingResponseDto.fromDomain(
      await this.ratingService.rateEvent(id, user.id, {
        eventStars: body.eventStars,
        organizerStars: body.organizerStars,
        comment: body.comment ?? null,
      }),
    );
  }
}
