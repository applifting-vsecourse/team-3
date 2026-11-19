import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

export class ConfirmAgeDto {
  @ApiProperty({ type: Boolean, enum: [true], example: true })
  @Equals(true)
  ageConfirmed!: true;
}
