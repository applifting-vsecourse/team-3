import { boxAround, distanceKm } from './distance';

const praha8 = { lat: 50.1103, lng: 14.4734 };
const letna = { lat: 50.0985, lng: 14.4222 };

describe('distanceKm', () => {
  it('measures across Prague in km', () => {
    expect(distanceKm(praha8, letna)).toBeCloseTo(3.9, 1);
    expect(distanceKm(praha8, praha8)).toBe(0);
  });
});

describe('boxAround', () => {
  it('holds every point of the circle', () => {
    const box = boxAround(praha8, 10);
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const rad = (bearing * Math.PI) / 180;
      const point = {
        lat: praha8.lat + (Math.cos(rad) * 9.99) / 111.32,
        lng:
          praha8.lng +
          (Math.sin(rad) * 9.99) /
            (111.32 * Math.cos((praha8.lat * Math.PI) / 180)),
      };
      expect(distanceKm(praha8, point)).toBeLessThan(10.05);
      expect(point.lat).toBeGreaterThanOrEqual(box.south);
      expect(point.lat).toBeLessThanOrEqual(box.north);
      expect(point.lng).toBeGreaterThanOrEqual(box.west);
      expect(point.lng).toBeLessThanOrEqual(box.east);
    }
  });
});
