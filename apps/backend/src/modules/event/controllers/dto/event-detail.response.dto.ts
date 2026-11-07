import { EventDetailView } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { PublicEventResponseDto } from './public-event.response.dto';

export class EventParticipantDto {
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

  @ApiProperty({
    enum: ['public', 'private', 'members'],
    description:
      "private: reachable through its link only; members: only the group's members (B-055)",
  })
  visibility!: 'public' | 'private' | 'members';

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
      "Approved participants, only for the organizer, an approved participant and, for a group event, the group's active members and admins (#174); null for anyone else (a visitor, a waiting applicant, someone who left or was removed), who sees only `capacity`",
  })
  participants!: EventParticipantDto[] | null;

  @ApiProperty({
    enum: ['pending', 'approved', 'rejected', 'removed'],
    nullable: true,
    description:
      "The signed-in user's own participation; null for a visitor or someone not in",
  })
  myParticipation!: 'pending' | 'approved' | 'rejected' | 'removed' | null;

  @ApiProperty({
    description:
      'Whether the request came with a valid session. The app uses it to spot an expired session: participants is null for many signed-in users too (#174).',
  })
  viewerSignedIn!: boolean;

  @ApiProperty({
    description:
      "Whether the signed-in user manages the event: its organizer or, for a group event, any of the group's admins (B-055)",
  })
  canManage!: boolean;

  static fromDomain(event: EventDetailView): EventDetailResponseDto {
    if (event.status === 'hidden' || event.status === 'deleted') {
      // the service answers 404 for these; this guards the response shape
      throw new Error(`Event ${event.id} is ${event.status}`);
    }
    return {
      ...PublicEventResponseDto.fromDomain(event),
      description: event.description,
      approvalMode: event.approvalMode,
      visibility: event.visibility,
      status: event.status,
      cancelReason: event.cancelReason,
      participants: event.participants,
      myParticipation: event.myParticipation,
      viewerSignedIn: event.viewerSignedIn,
      canManage: event.canManage,
    };
  }
}
