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

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 5,
    description:
      'The stars I gave the event (#66), null while I have not rated it or moderation deleted the rating; shown under tab=past (#367)',
  })
  myEventStars!: number | null;

  @ApiProperty({
    description:
      'My rating was deleted by moderation: it can only be restored, not given again (RATING_DELETED); false outside tab=past (#367)',
  })
  myRatingDeleted!: boolean;

  static fromDomain(event: MyEvent): MyEventResponseDto {
    return {
      ...PublicEventResponseDto.fromDomain(event),
      status: event.status,
      myParticipation: event.myParticipation,
      pendingRequests: event.pendingRequests,
      myEventStars: event.myEventStars,
      myRatingDeleted: event.myRatingDeleted,
    };
  }
}
