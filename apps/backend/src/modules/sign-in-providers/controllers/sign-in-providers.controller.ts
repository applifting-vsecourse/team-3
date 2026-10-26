import { signInProviders } from '@/shared/auth/config/social-sign-in';
import { Config } from '@/shared/config/config.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignInProvidersResponseDto } from './dto/sign-in-providers.response.dto';

// Not under /api/auth: that path belongs to BetterAuth (main.ts).
@ApiTags('auth')
@Controller('sign-in-providers')
export class SignInProvidersController {
  constructor(private readonly config: Config) {}

  @Get()
  @ApiOperation({
    summary:
      'Sign-in providers (#154): whether to offer „Pokračovat přes Google“',
    description:
      'Public. Decided by the same check that sets Google up in BetterAuth, so the button shows exactly when it works.',
  })
  @ApiOkResponse({ type: SignInProvidersResponseDto })
  get(): SignInProvidersResponseDto {
    return signInProviders(this.config);
  }
}
