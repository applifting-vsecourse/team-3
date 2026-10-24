import { GroupsService } from '@/modules/group/services/groups.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
import { CreateGroupDto, UpdateGroupDto } from './dto/group-input.dto';
import {
  GroupMembersResponseDto,
  JoinGroupResponseDto,
} from './dto/group-members.response.dto';
import {
  GroupDetailResponseDto,
  GroupResponseDto,
} from './dto/group.response.dto';
import { ListGroupsQueryDto } from './dto/list-groups.query.dto';

// Reading is public: visitors find groups without an account (US-16).
@ApiTags('groups')
@Controller('groups')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({
    summary: 'Active public and closed groups, by name, at most 200',
  })
  @ApiResponse({ status: 200, type: [GroupResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid filter' })
  async list(@Query() query: ListGroupsQueryDto): Promise<GroupResponseDto[]> {
    const groups = await this.groupsService.getActiveGroups({
      localityId: query.localityId,
      activityIds: query.activityId,
      categoryIds: query.categoryId,
    });
    return groups.map(GroupResponseDto.fromDomain);
  }

  @Get(':id')
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      'A group page, deactivated groups included; a signed-in viewer also gets their own membership',
  })
  @ApiResponse({ status: 200, type: GroupDetailResponseDto })
  @ApiResponse({ status: 404, description: 'No such group' })
  async detail(
    @Param('id') id: string,
    @OptionalUser() viewer: Identity | null,
  ): Promise<GroupDetailResponseDto> {
    return GroupDetailResponseDto.fromDomain(
      await this.groupsService.getGroup(id, viewer?.id ?? null),
    );
  }

  @Post()
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Found a group; the founder becomes its admin' })
  @ApiResponse({ status: 201, type: GroupDetailResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or unknown field' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @Body() body: CreateGroupDto,
    @User() user: Identity,
  ): Promise<GroupDetailResponseDto> {
    const group = await this.groupsService.createGroup(
      {
        name: body.name,
        description: body.description ?? null,
        activityId: body.activityId,
        localityId: body.localityId,
        type: body.type,
      },
      user.id,
    );
    return GroupDetailResponseDto.fromDomain(group);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Change a group; only its admins may' })
  @ApiResponse({ status: 200, type: GroupDetailResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or unknown field' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not an admin of the group' })
  @ApiResponse({ status: 404, description: 'No such group' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateGroupDto,
    @User() user: Identity,
  ): Promise<GroupDetailResponseDto> {
    const group = await this.groupsService.updateGroup(id, body, user.id);
    return GroupDetailResponseDto.fromDomain(group);
  }

  @Post(':id/join')
  @HttpCode(200)
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Join a public group at once, or ask to join a closed one; asking again changes nothing',
  })
  @ApiResponse({ status: 200, type: JoinGroupResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'MEMBER_BLOCKED' })
  @ApiResponse({ status: 404, description: 'No such group' })
  @ApiResponse({ status: 409, description: 'GROUP_INACTIVE' })
  async join(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<JoinGroupResponseDto> {
    return this.groupsService.join(id, user.id);
  }

  @Post(':id/leave')
  @HttpCode(204)
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Leave the group, or withdraw a pending request' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such group, or NOT_MEMBER' })
  @ApiResponse({ status: 409, description: 'LAST_ADMIN' })
  async leave(@Param('id') id: string, @User() user: Identity): Promise<void> {
    await this.groupsService.leave(id, user.id);
  }

  @Get(':id/members')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Pending requests and active members; only an admin of the group',
  })
  @ApiResponse({ status: 200, type: GroupMembersResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not an admin of the group' })
  @ApiResponse({ status: 404, description: 'No such group' })
  async members(
    @Param('id') id: string,
    @User() user: Identity,
  ): Promise<GroupMembersResponseDto> {
    return GroupMembersResponseDto.fromDomain(
      await this.groupsService.getMembers(id, user.id),
    );
  }

  @Post(':id/requests/:userId/approve')
  @HttpCode(204)
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Approve a pending request; any admin of the group',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not an admin of the group' })
  @ApiResponse({ status: 409, description: 'NOT_PENDING' })
  async approve(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<void> {
    await this.groupsService.approveRequest(id, user.id, userId);
  }

  @Post(':id/requests/:userId/reject')
  @HttpCode(204)
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Reject a pending request; it is removed, so the user can ask again',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not an admin of the group' })
  @ApiResponse({ status: 409, description: 'NOT_PENDING' })
  async reject(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<void> {
    await this.groupsService.rejectRequest(id, user.id, userId);
  }
}
