import { EventModerationService } from '@/modules/admin/services/event-moderation.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AdminGuard } from '@/shared/auth/guards/admin.guard';
import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
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
import { HideEventDto } from './dto/hide-event.dto';

/**
 * The superadmin's interventions on events (#308). The whole controller is
 * behind `AdminGuard`: 401 without a session, 403 `NOT_ADMIN` for anyone
 * but the superadmin. Editing an event needs no admin endpoint: the
 * superadmin uses `PATCH /api/events/:id` like its organizer.
 */
@ApiTags('admin')
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 403, description: 'NOT_ADMIN: not the superadmin' })
@UseGuards(AdminGuard)
// as every controller: there is no global pipe, without this the body went
// unvalidated and untrimmed (review #380)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly moderation: EventModerationService) {}

  @Post(':id/hide')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Deactivate the event (status hidden) with a reason; written to the history as hide_event. Not a cancellation: nobody is e-mailed and it can be restored.',
  })
  @ApiResponse({ status: 204, description: 'Deactivated' })
  @ApiResponse({ status: 400, description: 'Missing or too long reason' })
  @ApiResponse({ status: 404, description: 'No such event' })
  @ApiResponse({
    status: 409,
    description: 'EVENT_CANCELLED or EVENT_ALREADY_HIDDEN',
  })
  async hide(
    @Param('id') id: string,
    @Body() body: HideEventDto,
    @User() user: Identity,
  ): Promise<void> {
    await this.moderation.hideEvent(id, user.id, body.reason);
  }

  @Post(':id/unhide')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Restore a deactivated event (published again); its hide_event is marked reverted.',
  })
  @ApiResponse({ status: 204, description: 'Restored' })
  @ApiResponse({ status: 404, description: 'No such event' })
  @ApiResponse({ status: 409, description: 'EVENT_NOT_HIDDEN' })
  async unhide(@Param('id') id: string, @User() user: Identity): Promise<void> {
    await this.moderation.unhideEvent(id, user.id);
  }
}
