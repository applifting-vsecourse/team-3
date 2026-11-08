import { GroupEvent, GroupEvents } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { PublicEventResponseDto } from './public-event.response.dto';

/** An event on its group's page (B-055). */
export class GroupEventResponseDto extends PublicEventResponseDto {
  @ApiProperty({
    enum: ['public', 'members'],
    description: "members: only the group's members see it and join it",
  })
  visibility!: 'public' | 'members';

  static fromDomain(event: GroupEvent): GroupEventResponseDto {
    return {
      ...PublicEventResponseDto.fromDomain(event),
      visibility: event.visibility,
    };
  }
}

export class GroupEventsResponseDto {
  @ApiProperty({
    type: [GroupEventResponseDto],
    description: 'Published events still ahead, soonest first',
  })
  upcoming!: GroupEventResponseDto[];

  @ApiProperty({
    type: [GroupEventResponseDto],
    description: 'Published events that have started, the latest first',
  })
  past!: GroupEventResponseDto[];

  static fromDomain(events: GroupEvents): GroupEventsResponseDto {
    return {
      upcoming: events.upcoming.map(GroupEventResponseDto.fromDomain),
      past: events.past.map(GroupEventResponseDto.fromDomain),
    };
  }
}
