import { MY_EVENTS_TABS, MyEventsTab } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class MyEventsQueryDto {
  @ApiProperty({
    enum: MY_EVENTS_TABS,
    description:
      'attending = Přihlášen (approved and waiting), organizing = Pořádám, groups = Z mých skupin (events of my groups I can still ask to join, #304)',
  })
  @IsIn(MY_EVENTS_TABS)
  tab!: MyEventsTab;
}
