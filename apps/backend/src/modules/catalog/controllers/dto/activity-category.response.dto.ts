import { ActivityCategory } from '@/modules/catalog/domain/activity';
import { ApiProperty } from '@nestjs/swagger';

class ActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'volejbal' })
  slug!: string;

  @ApiProperty({ example: 'Volejbal' })
  name!: string;

  @ApiProperty({ type: [String], description: 'Synonyms for search' })
  keywords!: string[];
}

export class ActivityCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'tymove-sporty' })
  slug!: string;

  @ApiProperty({ example: 'Týmové sporty' })
  name!: string;

  @ApiProperty({
    description: 'Icon name of the category (Figma: Activity tile)',
  })
  icon!: string;

  @ApiProperty({ type: [ActivityDto] })
  activities!: ActivityDto[];

  static fromDomain(category: ActivityCategory): ActivityCategoryResponseDto {
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      activities: category.activities.map((activity) => ({
        id: activity.id,
        slug: activity.slug,
        name: activity.name,
        keywords: activity.keywords,
      })),
    };
  }
}
