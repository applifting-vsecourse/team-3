import { InviteService } from '@/modules/friendship/services/invite.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import {
  PublicReadThrottlerGuard,
  WriteThrottlerGuard,
} from '@/shared/rate-limit/rate-limit.guards';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
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
  AcceptInviteDto,
  InviterResponseDto,
  InviteStateResponseDto,
  MyInviteResponseDto,
} from './dto/invite.dto';
import { InviteLookupThrottlerGuard } from './invite-lookup-throttler.guard';

/**
 * Pozvánka od kamaráda (#406): my personal link, who a link belongs to (public, for the
 * sign-up's banner) and the onboarding's answer to it.
 */
@ApiTags('invites')
@Controller('invites')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class InvitesController {
  constructor(private readonly invites: InviteService) {}

  @Get('me')
  @ApiCookieAuth()
  // a verified account only: an unverified one's link would lead nowhere (findInviter)
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({
    summary:
      'Pozvi kamaráda: my invite link and how many joined through it (#406)',
  })
  @ApiResponse({ status: 200, type: MyInviteResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  mine(@User() user: Identity): Promise<MyInviteResponseDto> {
    return this.invites.mine(user.id);
  }

  @Post('me/regenerate')
  @HttpCode(200)
  @ApiCookieAuth()
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'Vytvořit nový odkaz: a new code, the old link stops working (#406)',
  })
  @ApiResponse({ status: 200, type: MyInviteResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  regenerate(@User() user: Identity): Promise<MyInviteResponseDto> {
    return this.invites.regenerate(user.id);
  }

  @Get(':code/preview')
  // crawlers of Meta and Apple come from many IPs and ask again per share: the generous
  // public-read limit (600 a minute per IP), not the lookup's 60 in 10 minutes
  @UseGuards(PublicReadThrottlerGuard)
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary:
      'Link preview of an invite for WhatsApp, Messenger, iMessage… (Open Graph HTML, #475)',
    description:
      'nginx sends link-preview crawlers of /pozvanka/:code here. Only the inviter’s first name; any code that leads to no one gets the generic title, also 200. A person is sent on to /pozvanka/:code by a meta refresh.',
  })
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'The preview page' })
  @ApiResponse({ status: 429, description: 'Too many requests from one IP' })
  preview(@Param('code') code: string): Promise<string> {
    return this.invites.preview(code);
  }

  @Get(':code')
  @UseGuards(InviteLookupThrottlerGuard)
  @ApiOperation({
    summary:
      'Who invites: the public name and interests of the link’s owner, for the sign-up (#406)',
  })
  @ApiResponse({ status: 200, type: InviterResponseDto })
  @ApiResponse({ status: 429, description: 'Too many lookups from one IP' })
  @ApiResponse({
    status: 404,
    description:
      'INVITE_NOT_FOUND: no such code, a replaced one, a blocked or deleted inviter — all alike',
  })
  inviter(@Param('code') code: string): Promise<InviterResponseDto> {
    return this.invites.inviter(code);
  }

  @Post(':code/accept')
  @HttpCode(200)
  @ApiCookieAuth()
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'The onboarding’s answer to the invite: friends at once for a newly invited user (#406)',
  })
  @ApiResponse({ status: 200, type: InviteStateResponseDto })
  @ApiResponse({ status: 400, description: 'SELF or invalid body' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED',
  })
  @ApiResponse({ status: 404, description: 'INVITE_NOT_FOUND' })
  async accept(
    @Param('code') code: string,
    @Body() { befriend }: AcceptInviteDto,
    @User() user: Identity,
  ): Promise<InviteStateResponseDto> {
    return { state: await this.invites.accept(user.id, code, befriend) };
  }
}
