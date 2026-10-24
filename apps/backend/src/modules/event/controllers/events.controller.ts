import { EventsService } from '@/modules/event/services/events.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { Config } from '@/shared/config/config.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { CancelEventDto } from './dto/cancel-event.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatedEventResponseDto } from './dto/created-event.response.dto';
import { EventDetailResponseDto } from './dto/event-detail.response.dto';
import { EventParticipantsResponseDto } from './dto/event-participants.response.dto';
import { ListEventsQueryDto } from './dto/list-events.query.dto';
import { PublicEventResponseDto } from './dto/public-event.response.dto';
import { UpdateEventDto } from './dto/update-event.dto';

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
  constructor(
    private readonly eventsService: EventsService,
    private readonly config: Config,
  ) {}

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

  @Post()
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Create an event; the organizer is the signed-in user (B-021), with a verified e-mail',
  })
  @ApiResponse({ status: 201, type: CreatedEventResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid field: e.g. min below 1, max below min, start in the past, unknown activity',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED, or USER_BLOCKED',
  })
  async create(
    @Body() body: CreateEventDto,
    @User() user: Identity,
  ): Promise<CreatedEventResponseDto> {
    const event = await this.eventsService.createEvent(
      {
        title: body.title,
        description: body.description || null,
        activityId: body.activityId,
        localityId: body.localityId,
        lat: body.lat,
        lng: body.lng,
        address: body.address,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        minParticipants: body.minParticipants,
        maxParticipants: body.maxParticipants,
        approvalMode: body.approvalMode,
      },
      user.id,
    );
    return CreatedEventResponseDto.fromCreated(event, this.config.frontendUrl);
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

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Cancel the event with a reason (B-028); only its organizer, before it starts. Never deleted.',
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({ status: 400, description: 'Missing or too long reason' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'NOT_ORGANIZER' })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({ status: 409, description: 'EVENT_CANCELLED or EVENT_STARTED' })
  async cancel(
    @Param('id') id: string,
    @Body() body: CancelEventDto,
    @User() user: Identity,
  ): Promise<EventDetailResponseDto> {
    return EventDetailResponseDto.fromDomain(
      await this.eventsService.cancelEvent(id, user.id, body.reason),
    );
  }

  // A session is enough: who may see the list is the organizer check.
  @Get(':id/participants')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      "Who is in, for the event's management page (B-033); only its organizer",
  })
  @ApiResponse({ status: 200, type: EventParticipantsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'NOT_ORGANIZER' })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  async participants(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<EventParticipantsResponseDto> {
    return EventParticipantsResponseDto.fromDomain(
      await this.eventsService.getParticipants(id, user.id),
    );
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

  @Patch(':id')
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Change the event (B-028); only its organizer, before it starts. Not the activity nor the way of joining.',
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid field, max below min or below the approved, a start in the past, or the event already started',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'NOT_ORGANIZER, EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({ status: 409, description: 'EVENT_CANCELLED' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateEventDto,
    @User() user: Identity,
  ): Promise<EventDetailResponseDto> {
    return EventDetailResponseDto.fromDomain(
      await this.eventsService.updateEvent(id, user.id, {
        ...body,
        // an emptied description is no description
        description:
          body.description === undefined ? undefined : body.description || null,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      }),
    );
  }
}
