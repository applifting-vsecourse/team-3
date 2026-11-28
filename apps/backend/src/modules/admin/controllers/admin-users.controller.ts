import { AdminOverview } from '@/modules/admin/repositories/user-moderation.repository';
import { UserModerationService } from '@/modules/admin/services/user-moderation.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AdminGuard } from '@/shared/auth/guards/admin.guard';
import { WriteThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import {
  Body,
  Controller,
  Get,
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
import { BlockUserDto } from './dto/block-user.dto';

/**
 * The superadmin's interventions on users and their overview (PO 26. 11., B-063), behind
 * `AdminGuard` like `/admin/events`: 401 without a session, 403 `NOT_ADMIN` for anyone else.
 */
@ApiTags('admin')
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 403, description: 'NOT_ADMIN: not the superadmin' })
@UseGuards(AdminGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly moderation: UserModerationService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'The superadmin’s Správa: deactivated events and blocked users, newest first, with the reasons',
  })
  overview(): Promise<AdminOverview> {
    return this.moderation.overview();
  }

  @Post('users/:id/block')
  @UseGuards(WriteThrottlerGuard)
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Block the user with a reason: their sessions end and every signed-in action is 403 USER_BLOCKED; written to the history as block_user.',
  })
  @ApiResponse({ status: 204, description: 'Blocked' })
  @ApiResponse({ status: 400, description: 'Missing or too long reason' })
  @ApiResponse({ status: 404, description: 'No such user' })
  @ApiResponse({
    status: 409,
    description:
      'CANNOT_BLOCK_SELF, CANNOT_BLOCK_ADMIN or USER_ALREADY_BLOCKED',
  })
  async block(
    @Param('id') id: string,
    @Body() body: BlockUserDto,
    @User() user: Identity,
  ): Promise<void> {
    await this.moderation.blockUser(id, user.id, body.reason);
  }

  @Post('users/:id/unblock')
  @UseGuards(WriteThrottlerGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Unblock the user; their block_user is marked reverted.',
  })
  @ApiResponse({ status: 204, description: 'Unblocked' })
  @ApiResponse({ status: 404, description: 'No such user' })
  @ApiResponse({ status: 409, description: 'USER_NOT_BLOCKED' })
  async unblock(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<void> {
    await this.moderation.unblockUser(id, user.id);
  }
}
