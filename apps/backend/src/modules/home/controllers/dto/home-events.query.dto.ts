import { ListEventsQueryDto } from '@/modules/event/controllers/dto/list-events.query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

// `?interests=true` arrives as a string; anything else than true/false is a 400
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** GET /home/events: the list filters of GET /events and the quick picks' personal parts (#250). */
export class HomeEventsQueryDto extends ListEventsQueryDto {
  @ApiPropertyOptional({
    description:
      'Only activities from the profile and of past events the user took part in; everything without any or for a visitor („Podle tvých zájmů“)',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  interests?: boolean;

  @ApiPropertyOptional({
    description:
      'Only organizers, or groups for their events, with an average of at least 4.5 from at least 3 ratings („Od dobře hodnocených“)',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  wellRated?: boolean;

  @ApiPropertyOptional({
    description:
      'No events the user organizes, joined, asked to join or was rejected or removed from („Tady chybíš“); a visitor keeps all',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  notJoined?: boolean;
}
