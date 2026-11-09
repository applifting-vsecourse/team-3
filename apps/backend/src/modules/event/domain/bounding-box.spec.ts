import { parseBoundingBox } from './bounding-box';

describe('parseBoundingBox', () => {
  it('reads west,south,east,north', () => {
    expect(parseBoundingBox('14.3,50.0,14.6,50.15')).toEqual({
      west: 14.3,
      south: 50,
      east: 14.6,
      north: 50.15,
    });
    expect(parseBoundingBox('-1,-2,1,2')).toEqual({
      west: -1,
      south: -2,
      east: 1,
      north: 2,
    });
  });

  it.each([
    ['', 'empty'],
    ['14.3,50.0,14.6', 'three numbers'],
    ['14.6,50.0,14.3,50.15', 'west after east'],
    ['14.3,50.15,14.6,50.0', 'south above north'],
    ['14.3,50,14.3,50.15', 'no width'],
    ['14.3,95,14.6,96', 'off the Earth'],
    ['a,b,c,d', 'not numbers'],
    ['1e2,50,14,51', 'exponent'],
  ])('rejects %p (%s)', (value) => {
    expect(parseBoundingBox(value)).toBeUndefined();
  });
});
