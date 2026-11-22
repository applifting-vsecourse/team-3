import { UserService } from '@/modules/user/services/user.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicUserResponseDto } from './dto/public-user.response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}
  @Get(':userId')
  // a visitor gets the profile too; a signed-in viewer also how they stand to the person (#307)
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      'Public profile: name, interests, ratings and public personal event history (#179); for a signed-in viewer the friendship, for a friend Kam jde (#307)',
  })
  @ApiResponse({ status: 200, type: PublicUserResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Unavailable, blocked or deleted profile',
  })
  async get(
    @Param('userId') userId: string,
    @OptionalUser() viewer: Identity | null,
  ): Promise<PublicUserResponseDto> {
    return PublicUserResponseDto.fromView(
      await this.users.getPublicProfile(userId, viewer?.id ?? null),
    );
  }
}
