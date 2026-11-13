import { PublicEventResponseDto } from '@/modules/event/controllers/dto/public-event.response.dto';
import { GroupResponseDto } from '@/modules/group/controllers/dto/group.response.dto';
import {
  HOME_SECTION_KEYS,
  HomeSectionKey,
} from '@/modules/home/domain/home-sections';
import { HomeView } from '@/modules/home/services/home.service';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class HomeLocalityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'praha-3' })
  slug!: string;

  @ApiProperty({ example: 'Praha 3' })
  name!: string;

  @ApiProperty({
    enum: ['query', 'profile'],
    description:
      'query: the localityId asked for; profile: the home locality of the signed-in user',
  })
  source!: 'query' | 'profile';
}

export class HomeSectionDto {
  @ApiProperty({
    enum: HOME_SECTION_KEYS,
    description:
      'highlight: the panel „Teď chybí jeden“ (1 event); missing: „Tady chybíš“; weekend: „Tento víkend“; ' +
      'interests: „Podle tvých zájmů“ (signed in only); nearby: „Kousek od tebe“ (only with a locality); ' +
      'popular: „O tyhle akce je zájem“ (visitors only); wellRated: „Od dobře hodnocených organizátorů“; ' +
      'groups: „Tyhle skupiny rozšiřují partu“',
  })
  key!: HomeSectionKey;

  @ApiPropertyOptional({
    type: [PublicEventResponseDto],
    description: 'Every section except groups; at most 3 (highlight 1)',
  })
  events?: PublicEventResponseDto[];

  @ApiPropertyOptional({
    type: [GroupResponseDto],
    description: 'Only the groups section; at most 3',
  })
  groups?: GroupResponseDto[];
}

export class HomeResponseDto {
  @ApiProperty({
    type: HomeLocalityDto,
    nullable: true,
    description: 'The locality the sections are for; null = all of Czechia',
  })
  locality!: HomeLocalityDto | null;

  @ApiProperty({
    type: [HomeSectionDto],
    description:
      'In the order of the page; a section with nothing in it is left out',
  })
  sections!: HomeSectionDto[];

  @ApiProperty({
    description:
      "Nothing in the locality one can join (#299) — no events, or only full ones and the signed-in user's own or joined ones: " +
      "the event sections hold the nearest events anywhere instead, each with distanceKm from its centre; groups stay the locality's",
  })
  isWidened!: boolean;

  @ApiProperty({
    description:
      "The locality (all of Czechia without one) has upcoming public events at all, full ones and the viewer's own included (#299). " +
      'With isWidened false here means „nothing here at all“, true „nothing here one can join“',
  })
  hasLocalityEvents!: boolean;

  static fromDomain(home: HomeView): HomeResponseDto {
    return {
      locality: home.locality,
      isWidened: home.isWidened,
      hasLocalityEvents: home.hasLocalityEvents,
      sections: home.sections.map((section) =>
        section.key === 'groups'
          ? {
              key: section.key,
              groups: section.groups.map(GroupResponseDto.fromDomain),
            }
          : {
              key: section.key,
              events: section.events.map(PublicEventResponseDto.fromDomain),
            },
      ),
    };
  }
}
