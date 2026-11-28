import { DEFAULT_PARTNER_RADIUS_KM } from '@/modules/partner/domain/partner-suggestions';
import { PartnerService } from '@/modules/partner/services/partner.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { VerifiedUserGuard } from '@/shared/auth/guards/verified-user.guard';
import { WriteThrottlerGuard } from '@/shared/rate-limit/rate-limit.guards';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
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
  PartnerRequestResponseDto,
  PartnerSuggestionsQueryDto,
  PartnerSuggestionsResponseDto,
} from './dto/partner.dto';

const AUTH_ERRORS = [
  { status: 401, description: 'Not signed in' },
  { status: 403, description: 'EMAIL_NOT_VERIFIED or USER_BLOCKED' },
] as const;

/**
 * Najdi parťáka (#84). The viewer is always the session's user; `:userId` is the other person.
 */
@ApiTags('partners')
@Controller('partners')
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PartnersController {
  constructor(private readonly partners: PartnerService) {}

  @Get('suggestions')
  // verified, as the people it shows; a blocked account sees nobody
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({
    summary:
      'Najdi parťáka: one page of people nearby who like the same activities (#84)',
  })
  @ApiResponse({ status: 200, type: PartnerSuggestionsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query, or INVALID_CURSOR' })
  @ApiResponse(AUTH_ERRORS[0])
  @ApiResponse(AUTH_ERRORS[1])
  @ApiResponse({
    status: 404,
    description: 'USER_NOT_FOUND: my account is gone',
  })
  suggestions(
    @Query() query: PartnerSuggestionsQueryDto,
    @User() user: Identity,
  ): Promise<PartnerSuggestionsResponseDto> {
    return this.partners.suggestions(
      user.id,
      query.radiusKm ?? DEFAULT_PARTNER_RADIUS_KM,
      query.cursor,
    );
  }

  @Post(':userId/request')
  @HttpCode(200)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'Přidat: a friendship request with its notification (#307, #86), or accepting theirs = a match; a daily limit of new requests by plan, free 20 (#84, #473)',
  })
  @ApiResponse({ status: 200, type: PartnerRequestResponseDto })
  @ApiResponse({ status: 400, description: 'SELF' })
  @ApiResponse(AUTH_ERRORS[0])
  @ApiResponse(AUTH_ERRORS[1])
  @ApiResponse({
    status: 404,
    description: 'USER_NOT_FOUND: no such, blocked or deleted account',
  })
  @ApiResponse({
    status: 409,
    description: 'ALREADY_FRIENDS, ALREADY_REQUESTED',
  })
  @ApiResponse({
    status: 429,
    description:
      'FRIEND_REQUEST_DAILY_LIMIT: no more new requests today (the friendship module’s limit, also on POST /api/friends/:userId)',
  })
  request(
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<PartnerRequestResponseDto> {
    return this.partners.request(user.id, userId);
  }

  @Post(':userId/skip')
  @HttpCode(204)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'Teď ne: the person isn’t suggested to me for 90 days, on any device; they never learn of it (#84)',
  })
  @ApiResponse({
    status: 204,
    description: 'Skipped (again: the 90 days start anew)',
  })
  @ApiResponse({ status: 400, description: 'SELF' })
  @ApiResponse(AUTH_ERRORS[0])
  @ApiResponse(AUTH_ERRORS[1])
  @ApiResponse({
    status: 404,
    description: 'USER_NOT_FOUND: no such, blocked or deleted account',
  })
  async skip(
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<void> {
    await this.partners.skip(user.id, userId);
  }

  @Delete(':userId/skip')
  @HttpCode(204)
  @UseGuards(VerifiedUserGuard, WriteThrottlerGuard)
  @ApiOperation({
    summary:
      'Vrátit: forget the last skip, the person is back in the deck (#84)',
  })
  @ApiResponse({
    status: 204,
    description: 'Forgotten (also when there was nothing)',
  })
  @ApiResponse({ status: 400, description: 'SELF' })
  @ApiResponse(AUTH_ERRORS[0])
  @ApiResponse(AUTH_ERRORS[1])
  async unskip(
    @Param('userId') userId: string,
    @User() user: Identity,
  ): Promise<void> {
    await this.partners.unskip(user.id, userId);
  }
}
