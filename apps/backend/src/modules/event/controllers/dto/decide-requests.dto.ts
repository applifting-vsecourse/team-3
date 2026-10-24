import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { EVENT_MAX_PARTICIPANTS } from './create-event.dto';

/**
 * POST /events/:id/participants/approve | reject (B-033, #53): whose requests.
 * One or more, decided all or none; the app sends one at a time (bulk is #60).
 */
export class DecideRequestsDto {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(EVENT_MAX_PARTICIPANTS)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  userIds!: string[];
}
