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
import {
  ParticipantRatingsResponseDto,
  RateParticipantsDto,
} from './dto/participant-ratings.dto';

// The organizer's side of /akce/:id/hodnoceni (B-060, Figma D-05).
@ApiTags('ratings')
@Controller('events')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ParticipantRatingsController {
  constructor(private readonly ratingService: RatingService) {}

  @Get(':id/participant-ratings')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      "The organizer's ratings of the event's approved participants (B-060, #66), and whether they may give or change them",
    description:
      'Only the organizer who created the event, also for an event of a group (not other admins of the group). ' +
      `\`refusal\` says why nobody can be rated now (cancelled, not over yet, after ${RATING_WINDOW_DAYS} calendar days in Prague).`,
  })
  @ApiResponse({ status: 200, type: ParticipantRatingsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'NOT_ORGANIZER' })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  async list(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<ParticipantRatingsResponseDto> {
    return ParticipantRatingsResponseDto.fromDomain(
      await this.ratingService.getParticipantRatings(id, user.id),
    );
  }

  @Put(':id/participant-ratings')
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: `Rate participants, one or all at once, or change their ratings (B-060, #66); within ${RATING_WINDOW_DAYS} calendar days (Prague) of the end`,
    description:
      'Each listed participant gets their own rating, which replaces the earlier one, comment included; ' +
      "participants not listed don't change. All or none: when one is refused, nothing is saved " +
      'and an error about one participant carries their `participantId`.',
  })
  @ApiResponse({ status: 200, type: ParticipantRatingsResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'No ratings, a participant twice, stars not 1–5, or a comment over 500 characters',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'NOT_ORGANIZER, EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  @ApiResponse({
    status: 409,
    description:
      'EVENT_NOT_PUBLISHED (cancelled), EVENT_NOT_ENDED, RATING_WINDOW_CLOSED, or for one participant ' +
      'SELF_RATING, NOT_APPROVED or RATING_DELETED with its `participantId`',
  })
  async rate(
    @Param('id') id: string,
    @Body() body: RateParticipantsDto,
    @User() user: Identity,
  ): Promise<ParticipantRatingsResponseDto> {
    return ParticipantRatingsResponseDto.fromDomain(
      await this.ratingService.rateParticipants(
        id,
        user.id,
        body.ratings.map(({ participantId, stars, comment }) => ({
          participantId,
          stars,
          comment: comment ?? null,
        })),
      ),
    );
  }
}
