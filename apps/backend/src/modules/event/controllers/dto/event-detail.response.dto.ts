import { EventDetailView } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { PublicEventResponseDto } from './public-event.response.dto';

class EventParticipantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Petra Nováková' })
  name!: string;
}

export class EventDetailResponseDto extends PublicEventResponseDto {
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({
    enum: ['open', 'approval'],
    description: 'open: joining is immediate; approval: the organizer approves',
  })
  approvalMode!: 'open' | 'approval';

  @ApiProperty({ enum: ['published', 'cancelled'] })
  status!: 'published' | 'cancelled';

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Set when the event is cancelled',
  })
  cancelReason!: string | null;

  @ApiProperty({
    type: [EventParticipantDto],
    nullable: true,
    description:
      'Approved participants for a signed-in user; null for a visitor, who gets only approvedCount',
  })
  participants!: EventParticipantDto[] | null;

  @ApiProperty({
    enum: ['pending', 'approved', 'rejected', 'removed'],
    nullable: true,
    description:
      "The signed-in user's own participation; null for a visitor or someone not in",
  })
  myParticipation!: 'pending' | 'approved' | 'rejected' | 'removed' | null;

  static fromDomain(event: EventDetailView): EventDetailResponseDto {
    if (event.status === 'hidden' || event.status === 'deleted') {
      // the service answers 404 for these; this guards the response shape
      throw new Error(`Event ${event.id} is ${event.status}`);
    }
    return {
      ...PublicEventResponseDto.fromDomain(event),
      description: event.description,
      approvalMode: event.approvalMode,
      status: event.status,
      cancelReason: event.cancelReason,
      participants: event.participants,
      myParticipation: event.myParticipation,
    };
  }
}
