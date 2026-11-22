import { NotificationCenterService } from '@/modules/notification/services/notification-center.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { WriteThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  MarkAllReadResponseDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';

/**
 * The centre of upozornění (#86, B-044). Always the session's user's own:
 * nobody reads or marks anyone else's, the queries are scoped to them.
 */
@ApiTags('notifications')
@Controller('notifications')
@ApiCookieAuth()
@UseGuards(AuthenticatedUserGuard)
export class NotificationsController {
  constructor(private readonly centre: NotificationCenterService) {}

  @Get()
  @ApiOperation({
    summary: 'My upozornění, newest first, and how many are unread (#86)',
  })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  list(@User() user: Identity): Promise<NotificationListResponseDto> {
    return this.centre.list(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'How many of my upozornění are unread (the bell)' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async unreadCount(@User() user: Identity): Promise<UnreadCountResponseDto> {
    return { count: await this.centre.unreadCount(user.id) };
  }

  // before :id/read, so „read-all“ is never taken for an id
  @Post('read-all')
  @UseGuards(WriteThrottlerGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Označit vše jako přečtené' })
  @ApiResponse({ status: 200, type: MarkAllReadResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async markAllRead(@User() user: Identity): Promise<MarkAllReadResponseDto> {
    return { marked: await this.centre.markAllRead(user.id) };
  }

  @Post(':id/read')
  @UseGuards(WriteThrottlerGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Mark one as read (opening it); one already read stays as it was',
  })
  @ApiResponse({ status: 204, description: 'Read' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 404,
    description: 'NOTIFICATION_NOT_FOUND: no such upozornění of mine',
  })
  markRead(@User() user: Identity, @Param('id') id: string): Promise<void> {
    return this.centre.markRead(user.id, id);
  }
}
