import { PublicEvent } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';

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

  static fromDomain(event: PublicEvent): PublicEventResponseDto {
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
      activity: event.activity,
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
    };
  }
}
