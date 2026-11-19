import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const HIDE_REASON_MAX_LENGTH = 500;

/**
 * POST /admin/events/:id/hide (#308): the reason is required (B-063) and
 * goes to the history (`ModerationAction.reason`).
 */
export class HideEventDto {
  @ApiProperty({
    maxLength: HIDE_REASON_MAX_LENGTH,
    example: 'Akce nabízí placené služby, ne společný koníček.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(HIDE_REASON_MAX_LENGTH)
  reason!: string;
}
