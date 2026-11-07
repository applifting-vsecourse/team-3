import { SimulatedInboxService } from '@/modules/simulated-inbox/services/simulated-inbox.service';
import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SimulatedInboxRequestDto } from './dto/simulated-inbox.request.dto';
import { SimulatedInboxResponseDto } from './dto/simulated-inbox.response.dto';
import { SimulatedInboxThrottlerGuard } from './simulated-inbox-throttler.guard';

// No session: since #236 an unverified e-mail can't sign in, and the
// unverified user is the one who needs the e-mail. The account's e-mail and
// password stand in for it, as on the sign-in form. POST, so the password
// never ends up in a URL or a log.
@ApiTags('auth')
@Controller('simulated-inbox')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class SimulatedInboxController {
  constructor(private readonly simulatedInboxService: SimulatedInboxService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(SimulatedInboxThrottlerGuard)
  @ApiOperation({
    summary:
      'Simulated inbox (#58): the verification e-mails the app would have sent to this account',
    description:
      'Only without an e-mail service (console mailer), kept in memory: the last 3 per address. Password-reset e-mails are never kept. No session needed (#236: an unverified e-mail cannot sign in); the e-mail and password of the account are, as for signing in. Only an unverified account gets an answer. 20 requests per address and 100 per IP in 10 minutes.',
  })
  @ApiOkResponse({ type: SimulatedInboxResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or unknown field' })
  @ApiResponse({
    status: 401,
    description:
      'INVALID_EMAIL_OR_PASSWORD: no such account, wrong password, or the e-mail is verified already (the same answer, so it does not tell which addresses have an account)',
  })
  @ApiResponse({ status: 403, description: 'USER_BLOCKED' })
  @ApiResponse({
    status: 404,
    description:
      'SIMULATED_INBOX_OFF: e-mails really go out (Resend or SMTP); answered before anything is counted or checked',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests for this address or from this IP',
  })
  async open(
    @Body() body: SimulatedInboxRequestDto,
  ): Promise<SimulatedInboxResponseDto> {
    return SimulatedInboxResponseDto.fromDomain(
      await this.simulatedInboxService.getMessages(body),
    );
  }
}
