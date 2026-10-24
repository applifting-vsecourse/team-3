import { EventsService } from '@/modules/event/services/events.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
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
import { EventDetailResponseDto } from './dto/event-detail.response.dto';
import { ListEventsQueryDto } from './dto/list-events.query.dto';
import { PublicEventResponseDto } from './dto/public-event.response.dto';

// Public on purpose: visitors browse upcoming events without an account (US-02).
@ApiTags('events')
@Controller('events')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Upcoming public events, soonest first, at most 200 (list and map)',
  })
  @ApiResponse({ status: 200, type: [PublicEventResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid filter' })
  async list(
    @Query() query: ListEventsQueryDto,
  ): Promise<PublicEventResponseDto[]> {
    const events = await this.eventsService.getPublicEvents({
      localityId: query.localityId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      activityIds: query.activityId,
      categoryIds: query.categoryId,
      capacity: query.capacity,
    });
    return events.map(PublicEventResponseDto.fromDomain);
  }

  // Keep below any fixed path like /events/facets, or `:id` would catch it.
  @Get(':id')
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      'One event for its detail page; public, a signed-in user also gets the participants',
    description:
      'Private events are returned (reachable through their link). Cancelled events are returned with their reason.',
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({
    status: 404,
    description:
      'Unknown, hidden or deleted event, or a members-only event and the caller is not a member',
  })
  async detail(
    @Param('id') id: string,
    @OptionalUser() viewer: Identity | null,
  ): Promise<EventDetailResponseDto> {
    const event = await this.eventsService.getEventDetail(
      id,
      viewer?.id ?? null,
    );
    return EventDetailResponseDto.fromDomain(event);
  }

  @Post(':id/participation')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Join the event (B-031): at once without approval, and the organizer always; with approval a request',
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED, or USER_BLOCKED',
  })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({
    status: 409,
    description:
      'EVENT_FULL, ALREADY_JOINED, EVENT_STARTED, EVENT_CANCELLED or PARTICIPATION_REFUSED',
  })
  async join(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<EventDetailResponseDto> {
    return EventDetailResponseDto.fromDomain(
      await this.eventsService.join(id, user.id),
    );
  }

  // Leaving needs only a session: someone who lost the verified state or got
  // blocked must still be able to free their place.
  @Delete(':id/participation')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Leave the event or withdraw a request, before it starts; the place is free again',
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({ status: 409, description: 'NOT_JOINED or EVENT_STARTED' })
  async leave(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<EventDetailResponseDto> {
    return EventDetailResponseDto.fromDomain(
      await this.eventsService.leave(id, user.id),
    );
  }
}
