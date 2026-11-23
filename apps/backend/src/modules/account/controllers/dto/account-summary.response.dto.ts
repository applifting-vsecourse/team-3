import type { AccountSummary } from '@/modules/account/services/account.service';
import { ApiProperty } from '@nestjs/swagger';

class GroupReferenceDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

/** GET /api/me/account: what the deletion dialog says beforehand (B-080). */
export class AccountSummaryResponseDto implements AccountSummary {
  @ApiProperty({
    description:
      'With a password the deletion asks for it, without one for the phrase',
  })
  hasPassword!: boolean;
  @ApiProperty({ example: 'smazat účet' }) confirmationPhrase!: string;
  @ApiProperty({
    type: [GroupReferenceDto],
    description:
      'Active groups the user is the only admin of: deactivated on deletion unless handed over first',
  })
  groupsRunAlone!: GroupReferenceDto[];
  @ApiProperty({ description: 'Upcoming events cancelled on deletion' })
  upcomingOrganizedCount!: number;
}
