import { MODERATION_REASON_MAX_LENGTH } from '@/modules/admin/domain/event-moderation';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** POST /admin/users/:id/block (PO 26. 11.): the reason is required and goes to the history. */
export class BlockUserDto {
  @ApiProperty({
    maxLength: MODERATION_REASON_MAX_LENGTH,
    example: 'Opakovaně posílá spam do zpráv skupiny.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Napiš důvod zablokování.' })
  @IsNotEmpty({ message: 'Napiš důvod zablokování.' })
  @MaxLength(MODERATION_REASON_MAX_LENGTH, {
    message: `Důvod může mít nejvýš ${MODERATION_REASON_MAX_LENGTH} znaků.`,
  })
  reason!: string;
}
