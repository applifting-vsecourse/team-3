import { GroupsService } from '@/modules/group/services/groups.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import {
  Body,
  Controller,
  Get,
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
  @ApiOperation({ summary: 'A group page, deactivated groups included' })
  @ApiResponse({ status: 200, type: GroupDetailResponseDto })
  @ApiResponse({ status: 404, description: 'No such group' })
  async detail(@Param('id') id: string): Promise<GroupDetailResponseDto> {
    return GroupDetailResponseDto.fromDomain(
      await this.groupsService.getGroup(id),
    );
  }

  @Post()
  // B-011: founding a group needs a verified e-mail
  @UseGuards(VerifiedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Found a group; the founder becomes its admin' })
  @ApiResponse({ status: 201, type: GroupDetailResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or unknown field' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED, or USER_BLOCKED',
  })
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
}
