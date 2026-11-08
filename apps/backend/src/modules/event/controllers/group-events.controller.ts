import { EventsService } from '@/modules/event/services/events.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GroupEventsResponseDto } from './dto/group-events.response.dto';

// Public like the group's page (B-052); the session only adds members-only events.
@ApiTags('events')
@Controller('groups/:groupId/events')
export class GroupEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      "A group's upcoming and past events for its page (B-055), at most 50 each",
    description:
      "Members-only events only for the group's active members and admins, decided from the session. Cancelled events are not listed.",
  })
  @ApiResponse({ status: 200, type: GroupEventsResponseDto })
  async list(
    @Param('groupId') groupId: string,
    @OptionalUser() viewer: Identity | null,
  ): Promise<GroupEventsResponseDto> {
    const events = await this.eventsService.getGroupEvents(
      groupId,
      viewer?.id ?? null,
    );
    return GroupEventsResponseDto.fromDomain(events);
  }
}
