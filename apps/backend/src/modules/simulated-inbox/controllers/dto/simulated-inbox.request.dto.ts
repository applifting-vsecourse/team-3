import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * POST /simulated-inbox (#236): the e-mail and password of the account, as
 * for signing in. An unverified e-mail can't sign in, so they stand in for
 * the session: only whoever knows the password reads the account's inbox.
 */
export class SimulatedInboxRequestDto {
  @ApiProperty({ example: 'eva.mala@example.com' })
  @IsString()
  @MinLength(1)
  @MaxLength(320)
  email!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(1)
  // BetterAuth's longest password
  @MaxLength(128)
  password!: string;
}
