import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// `?activityId=a` arrives as a string, `?activityId=a&activityId=b` as an array.
const toArray = ({ value }: TransformFnParams): unknown =>
  value === undefined || Array.isArray(value) ? value : [value];

/** Filters of GET /groups: activity + locality (PO 19. 10.), no name search in sprint 2. */
export class ListGroupsQueryDto {
  @ApiPropertyOptional({
    description:
      'A city includes all its districts, a district only itself (GET /localities)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  localityId?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Repeat the key for more (activityId=a&activityId=b, not activityId[]); adds up with categoryId (OR)',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  activityId?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Whole category incl. activities added later. Repeat the key for more; adds up with activityId (OR)',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  categoryId?: string[];
}
