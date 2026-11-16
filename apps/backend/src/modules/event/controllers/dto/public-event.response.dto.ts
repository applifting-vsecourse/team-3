import { PublicEvent } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';

class EventRatingDto {
  @ApiProperty({ type: Number, nullable: true, example: 4.5 })
  average!: number | null;

  @ApiProperty({ example: 3 })
  count!: number;
}

class EventCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'hry' })
  slug!: string;

  @ApiProperty({ example: 'Hry' })
  name!: string;

  @ApiProperty({
    description: 'Icon name of the category (Figma: Activity tile)',
  })
  icon!: string;
}

class EventActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'deskove-hry' })
  slug!: string;

  @ApiProperty({ example: 'Deskové hry' })
  name!: string;

  @ApiProperty({ type: EventCategoryDto })
  category!: EventCategoryDto;
}

class EventLocalityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'praha-8' })
  slug!: string;

  @ApiProperty({ example: 'Praha 8' })
  name!: string;
}

class EventOrganizerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class EventGroupDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class PublicEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Deskovky po práci v Karlíně' })
  title!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt!: Date | null;

  @ApiProperty({ example: 'Herna Karlín, Křižíkova 52, Praha 8' })
  address!: string;

  @ApiProperty({ example: 50.0928 })
  lat!: number;

  @ApiProperty({ example: 14.4508 })
  lng!: number;

  @ApiProperty({ type: EventActivityDto })
  activity!: EventActivityDto;

  @ApiProperty({ type: EventLocalityDto })
  locality!: EventLocalityDto;

  @ApiProperty({ type: EventOrganizerDto })
  organizer!: EventOrganizerDto;

  @ApiProperty({
    type: EventGroupDto,
    nullable: true,
    description: 'Set for a group event; the group is shown as the organizer',
  })
  group!: EventGroupDto | null;

  @ApiProperty({ example: 3 })
  minParticipants!: number;

  @ApiProperty({ example: 6 })
  maxParticipants!: number;

  @ApiProperty({ example: 2, description: 'Approved participations' })
  approvedCount!: number;

  @ApiProperty({ example: 1, description: 'People still needed to reach min' })
  missingToMin!: number;

  @ApiProperty({ example: 4 })
  freeSpots!: number;

  @ApiProperty()
  isFull!: boolean;

  @ApiProperty()
  isPromoted!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Kolem 8 km po Letné a Stromovce, tempo pohodové…',
    description:
      'The start of the description, at most 160 characters cut at a word (the map preview); null without one',
  })
  summary!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1.3,
    description:
      'Km from the point given by lat and lng (the chosen locality, #57), one decimal; null without one',
  })
  distanceKm!: number | null;

  @ApiProperty({
    type: EventRatingDto,
    nullable: true,
    description:
      'With past=true (Proběhlé, #61): the average rating of the event, null average without ratings; otherwise null',
  })
  rating!: EventRatingDto | null;

  static fromDomain(event: PublicEvent): PublicEventResponseDto {
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
      // the keywords are for the search only
      activity: {
        id: event.activity.id,
        slug: event.activity.slug,
        name: event.activity.name,
        category: event.activity.category,
      },
      locality: event.locality,
      organizer: event.organizer,
      group: event.group,
      minParticipants: event.minParticipants,
      maxParticipants: event.maxParticipants,
      approvedCount: event.capacity.approvedCount,
      missingToMin: event.capacity.missingToMin,
      freeSpots: event.capacity.freeSpots,
      isFull: event.capacity.isFull,
      isPromoted: event.isPromoted,
      summary: event.summary,
      distanceKm: event.distanceKm,
      rating: event.rating ?? null,
    };
  }
}
