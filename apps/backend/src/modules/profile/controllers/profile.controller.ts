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
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
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

  @Get('photo/:version')
  @Header('Cache-Control', 'private, no-store')
  @Header('Cross-Origin-Resource-Policy', 'same-site')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/webp')
  @ApiOperation({ summary: 'Get the current owner’s uploaded profile photo' })
  async photo(
    @User() user: Identity,
    @Param('version', new ParseUUIDPipe({ version: '4' })) version: string,
  ): Promise<StreamableFile> {
    const data = await this.profile.getPhoto(user.id, version);
    return new StreamableFile(Buffer.from(data), { type: 'image/webp' });
  }

  @Patch('details')
  @ProfileUpload()
  @ApiResponse({ status: 200, type: SelfProfileResponseDto })
  @ApiOperation({
    summary: 'Update my profile and optionally replace or remove its photo',
  })
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
  @UseGuards(VerifiedUserGuard)
  @ProfileUpload()
  @ApiOperation({
    summary:
      'Save the initial preferences and optional profile details together',
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
  @UseGuards(VerifiedUserGuard)
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
  @UseGuards(VerifiedUserGuard)
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
