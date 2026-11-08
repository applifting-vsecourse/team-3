import { UserService } from '@/modules/user/services/user.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicUserResponseDto } from './dto/public-user.response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}
  @Get(':userId')
  @ApiOperation({
    summary:
      'Public profile: name, interests, ratings and public personal event history (#179)',
  })
  @ApiResponse({ status: 200, type: PublicUserResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Unavailable, blocked or deleted profile',
  })
  get(@Param('userId') userId: string): Promise<PublicUserResponseDto> {
    return this.users.getPublicProfile(userId);
  }
}
