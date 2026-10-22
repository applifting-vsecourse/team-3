import { CatalogService } from '@/modules/catalog/services/catalog.service';
import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivityCategoryResponseDto } from './dto/activity-category.response.dto';
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
}
