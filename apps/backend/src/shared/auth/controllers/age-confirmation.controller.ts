import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

/** Only the signed-in account can confirm its age; the timestamp is server generated. */
@ApiTags('account')
@ApiCookieAuth()
@Controller('me')
export class AgeConfirmationController {
  constructor(
    @InjectBetterAuth private readonly auth: BetterAuth,
    private readonly prisma: PrismaService,
  ) {}

  @Post('confirm-age')
  @ApiOperation({
    summary: 'Confirm the signed-in account holder is at least 18',
  })
  @ApiResponse({ status: 201, description: 'Age confirmed' })
  @ApiResponse({ status: 400, description: 'Confirmation is required' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async confirm(
    @Req() request: Request,
    @Body() input: unknown,
  ): Promise<{ confirmed: true }> {
    const session = await getSessionFromRequest(request, this.auth);
    if (!session) throw new UnauthorizedException();
    if (
      !input ||
      typeof input !== 'object' ||
      !('ageConfirmed' in input) ||
      input.ageConfirmed !== true
    ) {
      throw new BadRequestException({
        code: 'AGE_CONFIRMATION_REQUIRED',
        message: 'Potvrď, že ti je alespoň 18 let.',
      });
    }
    // Idempotent: keep the original confirmation time on repeated requests.
    await this.prisma.user.updateMany({
      where: { id: session.user.id, ageConfirmedAt: null },
      data: { ageConfirmedAt: new Date() },
    });
    return { confirmed: true };
  }
}
