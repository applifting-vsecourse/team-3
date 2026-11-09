import { ProfileService } from '@/modules/profile/services/profile.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  Patch,
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
  ProfileOverviewResponseDto,
  SelfProfileResponseDto,
} from './dto/profile.response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profile')
@ApiCookieAuth()
@Controller('me/profile')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiResponse({ status: 200, type: SelfProfileResponseDto })
  @ApiOperation({
    summary: 'My profile: name, e-mail, home locality and interests (#178)',
  })
  @ApiResponse({ status: 401, description: 'Not signed in or deleted account' })
  get(@User() user: Identity): Promise<SelfProfileResponseDto> {
    return this.profile.get(user.id);
  }

  @Patch()
  @ApiResponse({ status: 200, type: SelfProfileResponseDto })
  @ApiOperation({
    summary: 'Update my name, home locality and interests (#178)',
  })
  update(
    @User() user: Identity,
    @Body() input: UpdateProfileDto,
  ): Promise<SelfProfileResponseDto> {
    return this.profile.update(user.id, input);
  }

  @Get('overview')
  @ApiResponse({ status: 200, type: ProfileOverviewResponseDto })
  @ApiOperation({
    summary:
      'My events and ratings; private, never selected by a request user ID (#178)',
  })
  async overview(@User() user: Identity): Promise<ProfileOverviewResponseDto> {
    return ProfileOverviewResponseDto.fromDomain(
      await this.profile.overview(user.id),
    );
  }
}
