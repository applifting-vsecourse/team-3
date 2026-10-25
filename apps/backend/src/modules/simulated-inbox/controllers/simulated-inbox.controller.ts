import { SimulatedInboxService } from '@/modules/simulated-inbox/services/simulated-inbox.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SimulatedInboxResponseDto } from './dto/simulated-inbox.response.dto';

// A session is enough: the unverified user is the one who needs the e-mail.
@ApiTags('auth')
@Controller('me/simulated-inbox')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
export class SimulatedInboxController {
  constructor(private readonly simulatedInboxService: SimulatedInboxService) {}

  @Get()
  @ApiOperation({
    summary:
      'Simulated inbox (#58): the verification e-mails the app would have sent me',
    description:
      'Only without an e-mail service (console mailer), kept in memory: the last 3 per address. Password-reset e-mails are never kept.',
  })
  @ApiOkResponse({ type: SimulatedInboxResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'USER_BLOCKED' })
  @ApiResponse({
    status: 404,
    description: 'SIMULATED_INBOX_OFF: e-mails really go out (Resend or SMTP)',
  })
  async list(@User() user: Identity): Promise<SimulatedInboxResponseDto> {
    return SimulatedInboxResponseDto.fromDomain(
      await this.simulatedInboxService.getMessages(user),
    );
  }
}
