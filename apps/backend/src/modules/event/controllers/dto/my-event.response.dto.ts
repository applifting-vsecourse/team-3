import { MyEvent } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { PublicEventResponseDto } from './public-event.response.dto';

/** An event in „Moje akce“ (B-035): the list's event and the user's place in it. */
export class MyEventResponseDto extends PublicEventResponseDto {
  @ApiProperty({ enum: ['published', 'cancelled'] })
  status!: 'published' | 'cancelled';

  @ApiProperty({
    enum: ['approved', 'pending'],
    nullable: true,
    description:
      "The user's place: approved, or a request waiting for the organizer; null when the organizer didn't join their own event",
  })
  myParticipation!: 'approved' | 'pending' | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2,
    description:
      'Requests waiting for approval; only under tab=organizing, null otherwise',
  })
  pendingRequests!: number | null;

  static fromDomain(event: MyEvent): MyEventResponseDto {
    return {
      ...PublicEventResponseDto.fromDomain(event),
      status: event.status,
      myParticipation: event.myParticipation,
      pendingRequests: event.pendingRequests,
    };
  }
}
