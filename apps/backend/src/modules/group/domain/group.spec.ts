import { MyGroup, sortMyGroups } from './group';

const aGroup = (name: string, status: 'active' | 'pending'): MyGroup => ({
  id: name,
  name,
  type: 'public',
  activity: {
    id: 'a',
    slug: 'a',
    name: 'A',
    category: { id: 'c', slug: 'c', name: 'C', icon: 'ball' },
  },
  locality: { id: 'l', slug: 'l', name: 'L' },
  memberCount: 1,
  membership: { role: 'member', status },
});

describe('sortMyGroups', () => {
  it('puts my waiting requests on top, then by name (Czech order)', () => {
    const sorted = sortMyGroups([
      aGroup('Volejbal', 'active'),
      aGroup('Deskovky', 'pending'),
      aGroup('Běžci', 'active'),
      aGroup('Čtenáři', 'active'),
    ]);
    expect(sorted.map((g) => g.name)).toEqual([
      'Deskovky',
      'Běžci',
      'Čtenáři',
      'Volejbal',
    ]);
  });
});
