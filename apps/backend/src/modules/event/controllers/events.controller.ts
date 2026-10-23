import { EventsService } from '@/modules/event/services/events.service';
import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
}
