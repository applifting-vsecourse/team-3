import { boxAround, distanceKm, LatLng } from './distance';

describe('distanceKm', () => {
  it('is 0 for the same point and about 185 km from Praha to Brno', () => {
    const praha = { lat: 50.0755, lng: 14.4378 };
    const brno = { lat: 49.1951, lng: 16.6068 };
    expect(distanceKm(praha, praha)).toBe(0);
    expect(distanceKm(praha, brno)).toBeGreaterThan(180);
    expect(distanceKm(praha, brno)).toBeLessThan(190);
  });
});

describe('boxAround (#57)', () => {
  const praha8 = { lat: 50.1103, lng: 14.4734 };

  // the point `km` away in the direction `bearing`, on the haversine's sphere
  const destination = (from: LatLng, km: number, bearing: number): LatLng => {
    const rad = Math.PI / 180;
    const angle = km / 6371;
    const lat1 = from.lat * rad;
    const b = bearing * rad;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angle) +
        Math.cos(lat1) * Math.sin(angle) * Math.cos(b),
    );
    const lng2 =
      from.lng * rad +
      Math.atan2(
        Math.sin(b) * Math.sin(angle) * Math.cos(lat1),
        Math.cos(angle) - Math.sin(lat1) * Math.sin(lat2),
      );
    return { lat: lat2 / rad, lng: lng2 / rad };
  };

  it.each([10, 25, 50])(
    'holds every point of the %i km circle, its edge included',
    (radiusKm) => {
      const box = boxAround(praha8, radiusKm);
      for (let bearing = 0; bearing < 360; bearing += 5) {
        const point = destination(praha8, radiusKm, bearing);
        expect(distanceKm(praha8, point)).toBeCloseTo(radiusKm, 6);
        expect(point.lat).toBeGreaterThanOrEqual(box.south);
        expect(point.lat).toBeLessThanOrEqual(box.north);
        expect(point.lng).toBeGreaterThanOrEqual(box.west);
        expect(point.lng).toBeLessThanOrEqual(box.east);
      }
    },
  );
});
