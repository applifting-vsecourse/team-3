import {
  REQUEST_MESSAGE_MAX_LENGTH,
  REQUEST_MESSAGE_NOT_TEXT,
  REQUEST_MESSAGE_TOO_LONG,
} from '@/shared/request-message/request-message';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Trimmed; blank is no message. Anything that isn't a string is left for
 * the validator to refuse.
 */
const normalizeRequestMessage = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * The body of POST /events/:id/participation and POST /groups/:id/join
 * (#175): an optional message for the organizer or the group's admins. Only
 * they see it, and only with a waiting request.
 */
export class RequestMessageDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: REQUEST_MESSAGE_MAX_LENGTH,
    description:
      'Optional; trimmed, blank is none. Kept only with a request that waits for approval.',
    example: 'Brass jsem hrála dvakrát, ráda si dám znovu.',
  })
  @Transform(({ value }: { value: unknown }) => normalizeRequestMessage(value))
  @IsOptional()
  @IsString({ message: REQUEST_MESSAGE_NOT_TEXT })
  @MaxLength(REQUEST_MESSAGE_MAX_LENGTH, { message: REQUEST_MESSAGE_TOO_LONG })
  message?: string | null;
}
