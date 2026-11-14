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
    description:
      'Published events that are not over yet – also one going on right now – soonest first (#272)',
  })
  upcoming!: GroupEventResponseDto[];

  @ApiProperty({
    type: [GroupEventResponseDto],
    description:
      'Published events that are over – after their end, without one after the Prague day they start on (#272) – the latest first',
  })
  past!: GroupEventResponseDto[];

  static fromDomain(events: GroupEvents): GroupEventsResponseDto {
    return {
      upcoming: events.upcoming.map(GroupEventResponseDto.fromDomain),
      past: events.past.map(GroupEventResponseDto.fromDomain),
    };
  }
}
