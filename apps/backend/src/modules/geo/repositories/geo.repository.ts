import { PrismaService } from '@/core/prisma/prisma.service';
import { Locality } from '@/modules/catalog/domain/locality';
import { Injectable } from '@nestjs/common';

const LOCALITY = {
  id: true,
  slug: true,
  name: true,
  parentId: true,
  lat: true,
  lng: true,
} as const;

@Injectable()
export class GeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The home locality from the user's profile (#178), null when none is set. */
  async findHomeLocality(userId: string): Promise<Locality | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { homeLocality: { select: LOCALITY } },
    });
    return user?.homeLocality ?? null;
  }

  async findLocalityBySlug(slug: string): Promise<Locality | null> {
    return this.prisma.locality.findUnique({
      where: { slug },
      select: LOCALITY,
    });
  }
}
