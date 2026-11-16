import { EventsService } from '@/modules/event/services/events.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { Config } from '@/shared/config/config.service';
import { RequestMessageDto } from '@/shared/request-message/dto/request-message.dto';
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
import { DecideRequestsDto } from './dto/decide-requests.dto';
import { EventDetailResponseDto } from './dto/event-detail.response.dto';
import {
  CreateEventMessageDto,
  EventMessageDto,
  EventMessagesResponseDto,
} from './dto/event-message.dto';
import { EventParticipantsResponseDto } from './dto/event-participants.response.dto';
import {
  ListEventsQueryDto,
  toPublicEventFilters,
} from './dto/list-events.query.dto';
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
      'Upcoming public events, soonest first or the most interest first (sort=popular), at most 200 (list, map and landing page); with past=true the events that are over, newest first (Proběhlé, #61)',
  })
  @ApiResponse({ status: 200, type: [PublicEventResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid filter' })
  async list(
    @Query() query: ListEventsQueryDto,
  ): Promise<PublicEventResponseDto[]> {
    const events = await this.eventsService.getPublicEvents(
      toPublicEventFilters(query),
      { sort: query.sort, limit: query.limit },
    );
    return events.map(PublicEventResponseDto.fromDomain);
  }

  @Post()
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      "Create an event; the organizer is the signed-in user (B-021), with a verified e-mail. With groupId it is the group's event, created by any of its admins (B-055)",
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
    description:
      'EMAIL_NOT_VERIFIED, USER_BLOCKED, or NOT_GROUP_ADMIN for a group event',
  })
  @ApiResponse({
    status: 409,
    description: 'GROUP_INACTIVE: the group is deactivated',
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
        groupId: body.groupId ?? null,
        visibility: body.visibility ?? 'public',
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
      'One event for its detail page; public, the names of participants only for those taking part',
    description:
      'Private events are returned (reachable through their link). Cancelled events are returned with their reason. ' +
      '`participants` (names) goes only to the organizer, a user with an approved place and, for a group event, ' +
      "the group's active members and admins, decided from the session (#174); everyone else gets null and the occupancy in `capacity`.",
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHENTICATED: a members-only event and no session',
  })
  @ApiResponse({
    status: 403,
    description:
      'MEMBERS_ONLY with `groupId` only: a members-only event and the caller is not an active member of its group (B-026)',
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
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
  @ApiResponse({
    status: 403,
    description:
      'NOT_ORGANIZER, or MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
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

  @Get(':id/messages')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      "The organizer's messages to the participants, newest first (#176); only for those who see „Kdo jde“ (#174)",
    description:
      "Readable by the organizer, a user with an approved place and, for a group event, the group's active members and admins, " +
      'decided from the session. A cancelled event keeps its messages. `remainingToday` only for the organizer of a published event.',
  })
  @ApiResponse({ status: 200, type: EventMessagesResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'NOT_PARTICIPANT (not someone who sees „Kdo jde“), or MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  async messages(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<EventMessagesResponseDto> {
    return EventMessagesResponseDto.fromDomain(
      await this.eventsService.getMessages(id, user.id),
    );
  }

  @Post(':id/messages')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Write to every approved participant by e-mail and show it on the detail (B-042, #176); only the organizer of a published event, at most 10 a day',
    description:
      'The e-mail goes after the message is saved and never fails the request. Waiting, rejected and removed people ' +
      "don't get it, nor does the organizer. The limit counts the event's messages since midnight in Prague.",
  })
  @ApiResponse({ status: 201, type: EventMessageDto })
  @ApiResponse({
    status: 400,
    description: 'Missing subject or text, or too long',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      "NOT_ORGANIZER (a group's admin included), or MEMBERS_ONLY (a members-only event, the caller is not a member)",
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown, hidden or deleted event',
  })
  @ApiResponse({ status: 409, description: 'EVENT_CANCELLED' })
  @ApiResponse({
    status: 429,
    description: 'MESSAGE_LIMIT: the event sent 10 today (Prague day)',
  })
  async sendMessage(
    @Param('id') id: string,
    @Body() body: CreateEventMessageDto,
    @User() user: Identity,
  ): Promise<EventMessageDto> {
    return EventMessageDto.fromDomain(
      await this.eventsService.sendMessage(id, user.id, {
        subject: body.subject,
        body: body.body,
      }),
    );
  }

  // A session is enough: who may see the list is the organizer check.
  @Get(':id/participants')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      "Who is in and who is waiting, for the event's management page (B-033); only its organizer",
  })
  @ApiResponse({ status: 200, type: EventParticipantsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'NOT_ORGANIZER, or MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  async participants(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<EventParticipantsResponseDto> {
    return EventParticipantsResponseDto.fromDomain(
      await this.eventsService.getParticipants(id, user.id),
    );
  }

  @Post(':id/participants/approve')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Approve waiting requests (B-033, #53), all or none; only the organizer',
  })
  @ApiResponse({ status: 200, type: EventParticipantsResponseDto })
  @ApiResponse({ status: 400, description: 'Missing or invalid userIds' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'NOT_ORGANIZER, EMAIL_NOT_VERIFIED, USER_BLOCKED, or MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({
    status: 409,
    description:
      'EVENT_FULL (nothing approved), NOT_PENDING, EVENT_CANCELLED or EVENT_STARTED',
  })
  async approve(
    @Param('id') id: string,
    @Body() body: DecideRequestsDto,
    @User() user: Identity,
  ): Promise<EventParticipantsResponseDto> {
    return EventParticipantsResponseDto.fromDomain(
      await this.eventsService.decideRequests(
        id,
        user.id,
        body.userIds,
        'approve',
      ),
    );
  }

  // Rejecting takes no place, so a session is enough (like cancelling).
  @Post(':id/participants/reject')
  @HttpCode(200)
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Reject waiting requests (B-033, #53), all or none; only the organizer',
  })
  @ApiResponse({ status: 200, type: EventParticipantsResponseDto })
  @ApiResponse({ status: 400, description: 'Missing or invalid userIds' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'NOT_ORGANIZER, or MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({
    status: 409,
    description: 'NOT_PENDING, EVENT_CANCELLED or EVENT_STARTED',
  })
  async reject(
    @Param('id') id: string,
    @Body() body: DecideRequestsDto,
    @User() user: Identity,
  ): Promise<EventParticipantsResponseDto> {
    return EventParticipantsResponseDto.fromDomain(
      await this.eventsService.decideRequests(
        id,
        user.id,
        body.userIds,
        'reject',
      ),
    );
  }

  @Post(':id/participation')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Join the event (B-031): at once without approval, and the organizer always; with approval a request with an optional message for the organizer (#175). Asking again while a request waits changes nothing (409 ALREADY_JOINED): the message is not replaced',
  })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid body: the message is not text or has more than 500 characters',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description:
      'EMAIL_NOT_VERIFIED, USER_BLOCKED, or MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
  @ApiResponse({ status: 404, description: 'No such event for this user' })
  @ApiResponse({
    status: 409,
    description:
      'EVENT_FULL, ALREADY_JOINED, EVENT_STARTED, EVENT_CANCELLED or PARTICIPATION_REFUSED',
  })
  async join(
    @Param('id') id: string,
    @Body() body: RequestMessageDto,
    @User() user: Identity,
  ): Promise<EventDetailResponseDto> {
    return EventDetailResponseDto.fromDomain(
      await this.eventsService.join(id, user.id, body.message ?? null),
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
  @ApiResponse({
    status: 403,
    description:
      'MEMBERS_ONLY (a members-only event, the caller is not a member)',
  })
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
    description:
      'NOT_ORGANIZER, EMAIL_NOT_VERIFIED, USER_BLOCKED, or MEMBERS_ONLY (a members-only event, the caller is not a member)',
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
        // null clears the end, a missing field keeps it
        endsAt:
          body.endsAt === undefined
            ? undefined
            : body.endsAt === null
              ? null
              : new Date(body.endsAt),
      }),
    );
  }
}
