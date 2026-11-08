import { distanceKm } from './distance';

describe('distanceKm', () => {
  it('is 0 for the same point and about 185 km from Praha to Brno', () => {
    const praha = { lat: 50.0755, lng: 14.4378 };
    const brno = { lat: 49.1951, lng: 16.6068 };
    expect(distanceKm(praha, praha)).toBe(0);
    expect(distanceKm(praha, brno)).toBeGreaterThan(180);
    expect(distanceKm(praha, brno)).toBeLessThan(190);
  });
});
