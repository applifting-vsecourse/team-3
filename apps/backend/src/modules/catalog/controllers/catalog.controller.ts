import { CatalogService } from '@/modules/catalog/services/catalog.service';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
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
import { ActivityCategoryResponseDto } from './dto/activity-category.response.dto';
import { CreateLocalityDto } from './dto/create-locality.dto';
import { LocalityResponseDto } from './dto/locality.response.dto';
import { SearchLocalitiesQueryDto } from './dto/search-localities.query.dto';

// Public on purpose: visitors filter events by activity and locality without an account (US-02).
@ApiTags('catalog')
@Controller()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('activities')
  @ApiOperation({ summary: 'Activity catalog as a tree: category › activity' })
  @ApiResponse({ status: 200, type: [ActivityCategoryResponseDto] })
  async listActivities(): Promise<ActivityCategoryResponseDto[]> {
    const categories = await this.catalogService.getActivityTree();
    return categories.map(ActivityCategoryResponseDto.fromDomain);
  }

  @Get('localities')
  @ApiOperation({ summary: 'Search localities by name (autocomplete)' })
  @ApiResponse({ status: 200, type: [LocalityResponseDto] })
  async searchLocalities(
    @Query() query: SearchLocalitiesQueryDto,
  ): Promise<LocalityResponseDto[]> {
    const localities = await this.catalogService.searchLocalities(query.query);
    return localities.map(LocalityResponseDto.fromDomain);
  }

  @Post('localities')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'A place picked from the online search (OpenStreetMap) as a locality: the existing one of that name nearby, or a new one',
  })
  @ApiResponse({ status: 201, type: LocalityResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid name or a place outside Czechia',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async addLocality(
    @Body() body: CreateLocalityDto,
  ): Promise<LocalityResponseDto> {
    const locality = await this.catalogService.addPlace(body);
    return LocalityResponseDto.fromDomain(locality);
  }
}
