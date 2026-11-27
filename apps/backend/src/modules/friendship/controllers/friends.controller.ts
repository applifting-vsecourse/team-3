import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { WriteThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import {
  FriendListsResponseDto,
  FriendshipStateResponseDto,
  UpdateFriendshipDto,
} from './dto/friendship.dto';

/**
 * Friends (B-017, #307). The viewer is always the session's user; `:userId` is the other
 * person. Each change answers with how the viewer stands to them afterwards.
 */
@ApiTags('friends')
@Controller('friends')
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class FriendsController {
  constructor(private readonly friends: FriendshipService) {}

  @Get()
  @UseGuards(AuthenticatedUserGuard)
  @ApiOperation({
    summary:
      'Lidé, které znám: my friends, requests waiting for me and my requests (#307)',
  })
  @ApiResponse({ status: 200, type: FriendListsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  list(@User() user: Identity): Promise<FriendListsResponseDto> {
    return this.friends.lists(user.id);
  }

  @Post(':userId')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'Přidat do přátel: send a request, or accept theirs when they already ask me (#307)',
  })
  @ApiResponse({ status: 200, type: FriendshipStateResponseDto })
  @ApiResponse({ status: 400, description: 'SELF' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({
    status: 404,
    description: 'USER_NOT_FOUND: no such, blocked or deleted account',
  })
  @ApiResponse({
    status: 409,
    description: 'ALREADY_FRIENDS, ALREADY_REQUESTED',
  })
  @ApiResponse({
    status: 429,
    description:
      'FRIEND_REQUEST_DAILY_LIMIT: 20 new requests a day from Prague midnight (#84); accepting is never limited',
  })
  async request(
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<FriendshipStateResponseDto> {
    return { state: await this.friends.request(user.id, userId) };
  }

  @Patch(':userId')
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary: 'Odmítnout: quietly reject the request waiting for me (#307)',
  })
  @ApiResponse({ status: 200, type: FriendshipStateResponseDto })
  @ApiResponse({ status: 400, description: 'SELF or invalid body' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({ status: 409, description: 'NO_REQUEST' })
  async reject(
    @Param('userId') userId: string,
    @Body() _input: UpdateFriendshipDto,
    @User() user: Identity,
  ): Promise<FriendshipStateResponseDto> {
    return { state: await this.friends.reject(user.id, userId) };
  }

  @Delete(':userId')
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'Zrušit žádost or Odebrat z přátel; a request may then be sent again (#307)',
  })
  @ApiResponse({ status: 200, type: FriendshipStateResponseDto })
  @ApiResponse({ status: 400, description: 'SELF' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({
    status: 404,
    description:
      'NO_FRIENDSHIP: not friends and no request of mine (a request waiting for me is rejected with PATCH)',
  })
  async remove(
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<FriendshipStateResponseDto> {
    return { state: await this.friends.remove(user.id, userId) };
  }
}
