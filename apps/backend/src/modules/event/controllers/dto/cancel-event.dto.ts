import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const CANCEL_REASON_MAX_LENGTH = 500;

/** POST /events/:id/cancel (B-028): the reason is required, the participants see it. */
export class CancelEventDto {
  @ApiProperty({
    maxLength: CANCEL_REASON_MAX_LENGTH,
    example: 'Herna má ten den zavřeno.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(CANCEL_REASON_MAX_LENGTH)
  reason!: string;
}
