import type {
  FriendLists,
  FriendPerson,
  FriendRequest,
} from '@/modules/friendship/domain/friend-list';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const FRIENDSHIP_STATES: FriendshipState[] = [
  'none',
  'outgoing',
  'incoming',
  'friends',
  'self',
];

/** PATCH /api/friends/:userId: the only change the addressee makes is rejecting. */
export class UpdateFriendshipDto {
  @ApiProperty({
    enum: ['rejected'],
    description:
      'Quietly reject the request waiting for me; the other still sees it as sent',
  })
  @IsIn(['rejected'])
  status!: 'rejected';
}

/** How I stand to the other person after the action, for their profile's button. */
export class FriendshipStateResponseDto {
  @ApiProperty({
    enum: FRIENDSHIP_STATES,
    description:
      'friends; outgoing = my request waits (also after a silent rejection); incoming = theirs waits for me; none; self',
  })
  state!: FriendshipState;
}

class FriendInterestDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

class FriendPersonDto implements FriendPerson {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [FriendInterestDto] })
  interests!: FriendPerson['interests'];
}

class FriendRequestDto implements FriendRequest {
  @ApiProperty({ type: FriendPersonDto }) person!: FriendPerson;
  @ApiProperty() requestedAt!: Date;
}

/** „Lidé, které znám“ (Figma B-05f, B-09): all of them at once, no paging (#307). */
export class FriendListsResponseDto implements FriendLists {
  @ApiProperty({
    type: [FriendPersonDto],
    description: 'Friends by name (Czech order)',
  })
  friends!: FriendPerson[];
  @ApiProperty({
    type: [FriendRequestDto],
    description: 'Requests waiting for me, the newest first',
  })
  incoming!: FriendRequest[];
  @ApiProperty({
    type: [FriendRequestDto],
    description:
      'My requests, the newest first; a quietly rejected one looks the same',
  })
  outgoing!: FriendRequest[];
}
