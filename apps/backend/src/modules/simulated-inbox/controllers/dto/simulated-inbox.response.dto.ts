import { SimulatedEmail } from '@/core/email/simulated-inbox/simulated-inbox';
import { ApiProperty } from '@nestjs/swagger';

class SimulatedEmailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Ověř si e-mail v HobbyHubu' })
  subject!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  sentAt!: string;

  @ApiProperty({ description: 'The e-mail as it would arrive, with the link' })
  html!: string;
}

/** GET /me/simulated-inbox (#58): what the console mailer would have sent. */
export class SimulatedInboxResponseDto {
  @ApiProperty({
    type: [SimulatedEmailDto],
    description:
      'Verification e-mails to the signed-in user, newest first; may be empty',
  })
  messages!: SimulatedEmailDto[];

  static fromDomain(emails: SimulatedEmail[]): SimulatedInboxResponseDto {
    return {
      messages: emails.map(({ id, subject, sentAt, html }) => ({
        id,
        subject,
        sentAt: sentAt.toISOString(),
        html,
      })),
    };
  }
}
