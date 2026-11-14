import {
  GroupMemberEntry,
  GroupMembers,
} from '@/modules/group/domain/membership';
import { ApiProperty } from '@nestjs/swagger';

class GroupMemberEntryDto {
  @ApiProperty({
    description:
      "The member's or applicant's user id, for the public profile `GET /api/users/:userId` (#289)",
  })
  userId!: string;

  @ApiProperty({ example: 'Jakub Král' })
  name!: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  role!: 'admin' | 'member';

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When they asked (a request) or joined (a member)',
  })
  since!: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "The applicant's message to the admins (#175); always null for a member",
    example: 'Ahoj, v Pardubicích jsem hrál krajskou ligu.',
  })
  message!: string | null;

  static fromDomain({
    userId,
    name,
    role,
    since,
    message,
  }: GroupMemberEntry): GroupMemberEntryDto {
    return { userId, name, role, since, message };
  }
}

/** GET /groups/:id/members — the group's management (Figma D-07). */
export class GroupMembersResponseDto {
  @ApiProperty({
    type: [GroupMemberEntryDto],
    description: 'Pending requests, oldest first',
  })
  requests!: GroupMemberEntryDto[];

  @ApiProperty({
    type: [GroupMemberEntryDto],
    description: 'Active members, admins first',
  })
  members!: GroupMemberEntryDto[];

  static fromDomain(members: GroupMembers): GroupMembersResponseDto {
    return {
      requests: members.requests.map(GroupMemberEntryDto.fromDomain),
      members: members.members.map(GroupMemberEntryDto.fromDomain),
    };
  }
}

/** POST /groups/:id/join */
export class JoinGroupResponseDto {
  @ApiProperty({
    enum: ['active', 'pending'],
    description:
      'active: a member at once (public); pending: a request (closed)',
  })
  status!: 'active' | 'pending' | 'blocked';
}
