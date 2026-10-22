import { PrismaService } from '@/core/prisma/prisma.service';
import { ActivityCategory } from '@/modules/catalog/domain/activity';
import { Locality } from '@/modules/catalog/domain/locality';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActivityTree(): Promise<ActivityCategory[]> {
    const categories = await this.prisma.activityCategory.findMany({
      include: { activities: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map((category) => ({
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
    }));
  }

  /** Localities whose name or slug contains `query` (case-insensitive). */
  async findLocalities(query: {
    name: string;
    slug: string;
    limit: number;
  }): Promise<Locality[]> {
    const localities = await this.prisma.locality.findMany({
      where: {
        OR: [
          { name: { contains: query.name, mode: 'insensitive' } },
          { slug: { contains: query.slug } },
        ],
      },
      take: query.limit,
    });
    return localities.map((locality) => ({
      id: locality.id,
      slug: locality.slug,
      name: locality.name,
      parentId: locality.parentId,
      lat: locality.lat,
      lng: locality.lng,
    }));
  }
}
