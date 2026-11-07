import {
  SIMULATED_INBOX,
  SimulatedInbox,
} from '@/core/email/simulated-inbox/simulated-inbox';
import { signInProviders } from '@/shared/auth/config/social-sign-in';
import { Config } from '@/shared/config/config.service';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignInProvidersResponseDto } from './dto/sign-in-providers.response.dto';

// Not under /api/auth: that path belongs to BetterAuth (main.ts).
@ApiTags('auth')
@Controller('sign-in-providers')
export class SignInProvidersController {
  constructor(
    private readonly config: Config,
    @Inject(SIMULATED_INBOX) private readonly inbox: SimulatedInbox | null,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Sign-in providers (#154): whether to offer „Pokračovat přes Google“',
    description:
      'Public. Decided by the same check that sets Google up in BetterAuth, so the button shows exactly when it works. Also whether „Ověř si e-mail“ offers the simulated inbox (#236): the same for every visitor, so it tells nothing about any account.',
  })
  @ApiOkResponse({ type: SignInProvidersResponseDto })
  get(): SignInProvidersResponseDto {
    return {
      ...signInProviders(this.config),
      simulatedInbox: this.inbox !== null,
    };
  }
}
