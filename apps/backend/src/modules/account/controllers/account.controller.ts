import type { AccountExport } from '@/modules/account/domain/account-export';
import { AccountService } from '@/modules/account/services/account.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  AccountDeletionThrottlerGuard,
  AccountExportThrottlerGuard,
} from '@/shared/rate-limit/rate-limit.guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Req,
  Res,
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
import { Request, Response } from 'express';
import { AccountSummaryResponseDto } from './dto/account-summary.response.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

/** The file's name: „hobbyhub-moje-data-2026-11-23.json“. */
export const exportFileName = (now: Date): string =>
  `hobbyhub-moje-data-${now.toISOString().slice(0, 10)}.json`;

/**
 * The account itself (B-080, #64): its data to download and its deletion.
 * The owner is always the session's user, never an id from the request.
 */
@ApiTags('account')
@ApiCookieAuth()
@Controller('me')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('account')
  @ApiOperation({
    summary:
      'What deleting my account would do: how to confirm it, groups I run alone, events to cancel (#64)',
  })
  @ApiResponse({ status: 200, type: AccountSummaryResponseDto })
  summary(@User() user: Identity): Promise<AccountSummaryResponseDto> {
    return this.account.summary(user.id);
  }

  @Get('export')
  @UseGuards(AccountExportThrottlerGuard)
  @ApiOperation({
    summary:
      'Download my data as JSON: profile, participations, organized events, groups, ratings, friends, upozornění (#64, GDPR art. 20)',
  })
  @ApiResponse({ status: 200, description: 'A JSON file (attachment)' })
  async export(
    @User() user: Identity,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountExport> {
    const now = new Date();
    const data = await this.account.export(user.id, now);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportFileName(now)}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    return data;
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AccountDeletionThrottlerGuard)
  @ApiOperation({
    summary:
      'Delete my account, confirmed by my password, or by the phrase and a fresh sign-in without one (#64, B-080)',
  })
  @ApiResponse({ status: 204, description: 'Deleted and signed out' })
  @ApiResponse({
    status: 400,
    description: 'PASSWORD_REQUIRED, INVALID_PASSWORD or CONFIRMATION_MISMATCH',
  })
  @ApiResponse({
    status: 403,
    description:
      'REAUTHENTICATION_REQUIRED: an account without a password signed in too long ago',
  })
  async delete(
    @User() user: Identity,
    @Body() input: DeleteAccountDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.account.delete(user.id, input, request);
  }
}
