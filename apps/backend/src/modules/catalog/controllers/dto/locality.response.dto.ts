import { Locality } from '@/modules/catalog/domain/locality';
import { ApiProperty } from '@nestjs/swagger';

export class LocalityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'praha-7' })
  slug!: string;

  @ApiProperty({ example: 'Praha 7' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'City of a district, null for a city',
  })
  parentId!: string | null;

  @ApiProperty({ example: 50.103 })
  lat!: number;

  @ApiProperty({ example: 14.437 })
  lng!: number;

  static fromDomain(locality: Locality): LocalityResponseDto {
    return {
      id: locality.id,
      slug: locality.slug,
      name: locality.name,
      parentId: locality.parentId,
      lat: locality.lat,
      lng: locality.lng,
    };
  }
}
