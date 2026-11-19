import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { MyEventsQueryDto } from './my-events.query.dto';

const invalidOf = (query: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(MyEventsQueryDto, query), {
    whitelist: true,
  }).map((error) => error.property);

describe('MyEventsQueryDto', () => {
  it.each(['attending', 'organizing', 'groups', 'past'])(
    'accepts tab=%s',
    (tab) => {
      expect(invalidOf({ tab })).toEqual([]);
    },
  );

  // the API's names, not the URL's (`probehle`, `poradam`)
  it.each([{}, { tab: 'probehle' }, { tab: 'poradam' }])(
    'rejects %o',
    (query) => {
      expect(invalidOf(query)).toEqual(['tab']);
    },
  );
});
