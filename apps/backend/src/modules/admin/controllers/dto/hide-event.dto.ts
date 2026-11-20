import { MODERATION_REASON_MAX_LENGTH } from '@/modules/admin/domain/event-moderation';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const HIDE_REASON_MAX_LENGTH = MODERATION_REASON_MAX_LENGTH;

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
  // checked after the trim above (review #380): blanks are no reason
  @IsString({ message: 'Napiš důvod deaktivace.' })
  @IsNotEmpty({ message: 'Napiš důvod deaktivace.' })
  @MaxLength(HIDE_REASON_MAX_LENGTH, {
    message: `Důvod může mít nejvýš ${HIDE_REASON_MAX_LENGTH} znaků.`,
  })
  reason!: string;
}
