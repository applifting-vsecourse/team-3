import { FRIENDSHIP_STATES } from '@/modules/friendship/controllers/dto/friendship.dto';
import type { FriendshipState } from '@/modules/friendship/domain/friendship';
import type { Inviter } from '@/modules/friendship/repositories/invite.repository';
import type { MyInvite } from '@/modules/friendship/services/invite.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** POST /api/invites/:code/accept: the onboarding's answer to „{jméno} tě sem zve“. */
export class AcceptInviteDto {
  @ApiProperty({
    description:
      'true = „Přidat do přátel“; false = „Teď ne“ (the inviter still hears the user joined)',
  })
  @IsBoolean()
  befriend!: boolean;
}

/** „Pozvi kamaráda“ on Můj profil. */
export class MyInviteResponseDto implements MyInvite {
  @ApiProperty({ example: 'q3Zr1hXkE0bLw9yT2vNcAa' }) code!: string;
  @ApiProperty({
    example: 'https://hobbyhub.cz/pozvanka/q3Zr1hXkE0bLw9yT2vNcAa',
    description: 'The link to share, on the configured frontend',
  })
  url!: string;
  @ApiProperty({ description: 'How many signed up through my link' })
  joinedCount!: number;
}

/** Who invites: what their public profile shows anyway, nothing more. */
export class InviterResponseDto implements Inviter {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({
    type: [String],
    description: 'Up to 3 interests by name, for the sign-up banner',
  })
  interests!: string[];
}

export class InviteStateResponseDto {
  @ApiProperty({
    enum: FRIENDSHIP_STATES,
    description:
      'How I stand to the inviter afterwards: friends at once when invited, outgoing for an ordinary request',
  })
  state!: FriendshipState;
}
