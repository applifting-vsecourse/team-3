import type { UploadedImageFile } from '@/modules/image/controllers/image-upload';
import type {
  OnboardingInput,
  UpdateProfileInput,
} from '@/modules/profile/domain/profile';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { WriteThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UploadedFile,
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
  CompleteOnboardingDto,
  OnboardingProfileDto,
  OnboardingResultDto,
} from './dto/onboarding.dto';
import {
  ProfileOverviewResponseDto,
  SelfProfileResponseDto,
} from './dto/profile.response.dto';
import {
  UpdateProfileDto,
  UpdateProfileWithPhotoDto,
} from './dto/update-profile.dto';
import { ProfilePayloadPipe, ProfileUpload } from './profile-upload';

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
  @UseGuards(WriteThrottlerGuard)
  @ApiResponse({ status: 200, type: SelfProfileResponseDto })
  @ApiOperation({
    summary:
      'Update my name, bio, home locality, interests and who sees what (#178, #64)',
  })
  update(
    @User() user: Identity,
    @Body() input: UpdateProfileDto,
  ): Promise<SelfProfileResponseDto> {
    return this.profile.update(user.id, input);
  }

  @Patch('details')
  @UseGuards(WriteThrottlerGuard)
  @ProfileUpload()
  @ApiResponse({ status: 200, type: SelfProfileResponseDto })
  @ApiOperation({
    summary: 'Update my profile and replace or remove its photo (#64)',
    description:
      'multipart/form-data: `profile` = the JSON of PATCH /api/me/profile (+ `removePhoto`), `image` = JPEG, PNG or WebP up to 5 MB. The photo is then at GET /api/images/{photoKey}.',
  })
  @ApiResponse({
    status: 400,
    description: 'INVALID_PHOTO, INVALID_NAME, … (Czech message)',
  })
  @ApiResponse({ status: 413, description: 'Over 5 MB (Czech message)' })
  updateWithPhoto(
    @User() user: Identity,
    @Body('profile', new ProfilePayloadPipe(UpdateProfileWithPhotoDto))
    payload: UpdateProfileInput & { removePhoto?: boolean },
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<SelfProfileResponseDto> {
    const { removePhoto, ...input } = payload;
    return this.profile.update(user.id, input, {
      bytes: file?.buffer,
      remove: removePhoto,
    });
  }

  @Post('onboarding/profile')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ProfileUpload()
  @ApiOperation({
    summary:
      'Save the initial preferences with the optional „Představ se partě“ step: photo, name, bio (#296, #64)',
  })
  @ApiResponse({ status: 200, type: OnboardingResultDto })
  finishOnboardingProfile(
    @User() user: Identity,
    @Body('profile', new ProfilePayloadPipe(OnboardingProfileDto))
    payload: Omit<OnboardingInput, 'displayName'> & { name?: string },
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<OnboardingResultDto> {
    const { name, ...preferences } = payload;
    return this.profile.finishOnboarding(
      user.id,
      { ...preferences, displayName: name },
      file?.buffer,
    );
  }

  @Post('onboarding')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary: 'Save the initial locality and interests once (#296)',
  })
  @ApiResponse({ status: 200, type: OnboardingResultDto })
  finishOnboarding(
    @User() user: Identity,
    @Body() input: CompleteOnboardingDto,
  ): Promise<OnboardingResultDto> {
    return this.profile.finishOnboarding(user.id, input);
  }

  @Post('onboarding/skip')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({ summary: 'Skip the initial onboarding once (#296)' })
  @ApiResponse({ status: 200, type: OnboardingResultDto })
  skipOnboarding(@User() user: Identity): Promise<OnboardingResultDto> {
    return this.profile.finishOnboarding(user.id);
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
