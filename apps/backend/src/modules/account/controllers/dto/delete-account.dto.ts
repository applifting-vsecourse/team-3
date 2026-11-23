import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** BetterAuth refuses longer passwords anyway (its maxPasswordLength). */
export const DELETE_PASSWORD_MAX_LENGTH = 128;
export const DELETE_CONFIRMATION_MAX_LENGTH = 100;

/**
 * DELETE /api/me (B-080): an account with a password sends `password`, one
 * signed up with Google only (no password) the phrase in `confirmation`.
 * Which one is needed is the server's decision, from the account
 * (GET /api/me/account › hasPassword). The password is never trimmed.
 */
export class DeleteAccountDto {
  @ApiPropertyOptional({ maxLength: DELETE_PASSWORD_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(DELETE_PASSWORD_MAX_LENGTH)
  password?: string;

  @ApiPropertyOptional({
    maxLength: DELETE_CONFIRMATION_MAX_LENGTH,
    example: 'smazat účet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(DELETE_CONFIRMATION_MAX_LENGTH)
  confirmation?: string;
}
