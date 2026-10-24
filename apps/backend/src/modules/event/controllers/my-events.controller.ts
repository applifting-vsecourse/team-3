import { EventsService } from '@/modules/event/services/events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Get,
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
import { MyEventResponseDto } from './dto/my-event.response.dto';
import { MyEventsQueryDto } from './dto/my-events.query.dto';

// A session is enough: an unverified user still sees where they signed up.
@ApiTags('events')
@Controller('me/events')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class MyEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Moje akce (B-035): upcoming events I attend or organize, soonest first',
    description:
      'attending: approved places and requests waiting for approval; organizing: events I created. Cancelled events stay with status cancelled.',
  })
  @ApiResponse({ status: 200, type: [MyEventResponseDto] })
  @ApiResponse({ status: 400, description: 'Missing or unknown tab' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @Query() query: MyEventsQueryDto,
    @User() user: Identity,
  ): Promise<MyEventResponseDto[]> {
    const events = await this.eventsService.getMyEvents(user.id, query.tab);
    return events.map(MyEventResponseDto.fromDomain);
  }
}
