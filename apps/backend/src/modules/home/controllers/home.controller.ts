import { HomeService } from '@/modules/home/services/home.service';
import { OptionalUser } from '@/shared/auth/decorators/optional-user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import {
  Controller,
  Get,
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
import { HomeQueryDto } from './dto/home.query.dto';
import { HomeResponseDto } from './dto/home.response.dto';

// Public on purpose: the landing page is for visitors too (US-01); a session
// only changes which sections come back.
@ApiTags('home')
@Controller('home')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @UseGuards(OptionalUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Sections of the landing page (#182), chosen and ordered by the server; public, more for a signed-in user',
    description:
      'Only upcoming, published, public events that are not full. An event is only in the first section it belongs to ' +
      '(the highlight panel is the first). A signed-in user gets no events they organize, already joined or asked to join, or were rejected or removed from, ' +
      'no groups they are in, and `interests` instead of `popular`; a visitor the other way round. ' +
      '`interests`: activities from the profile and of past events the user took part in, otherwise a random pick. ' +
      '`wellRated`: an organizer, or a group for its events, with an average of at least 4.5 from at least 3 ratings; one event per organizer. ' +
      '`groups`: active public and closed groups of the locality with an upcoming event, the soonest next event first. ' +
      'Events carry what GET /events returns, groups what GET /groups returns, nothing more about people.',
  })
  @ApiResponse({ status: 200, type: HomeResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or unknown localityId' })
  async home(
    @Query() query: HomeQueryDto,
    @OptionalUser() viewer: Identity | null,
  ): Promise<HomeResponseDto> {
    return HomeResponseDto.fromDomain(
      await this.homeService.getHome(
        { localityId: query.localityId },
        viewer?.id ?? null,
      ),
    );
  }
}
