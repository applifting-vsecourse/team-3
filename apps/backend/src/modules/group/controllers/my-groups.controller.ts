import { GroupsService } from '@/modules/group/services/groups.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MyGroupResponseDto } from './dto/group.response.dto';

// A session is enough, like „Moje akce“: an unverified user still sees their groups.
@ApiTags('groups')
@Controller('me/groups')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
export class MyGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Moje skupiny (B-056): active groups where I am a member or wait for approval',
    description:
      'Each with my role and status; my waiting requests first, then by name. Deactivated groups and blocked memberships are left out.',
  })
  @ApiResponse({ status: 200, type: [MyGroupResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(@User() user: Identity): Promise<MyGroupResponseDto[]> {
    const groups = await this.groupsService.getMyGroups(user.id);
    return groups.map(MyGroupResponseDto.fromDomain);
  }
}
