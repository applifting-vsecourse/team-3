import { toSlug } from '@/modules/catalog/services/catalog.service';
import { czechTowns } from './czech-towns';
import { demoLocalities } from './demo-data';

// Města z OpenStreetMap doplňují katalog lokalit. Seed je páruje podle slugu,
// takže slug musí sedět s pravidlem migrace a nesmí se potkat s krajskými městy.

describe('czech towns', () => {
  it('covers Czechia, not just the regional cities', () => {
    expect(czechTowns.length).toBeGreaterThan(500);
    const names = new Set(czechTowns.map((t) => t.name));
    for (const name of [
      'Ústí nad Orlicí',
      'Zlín',
      'Jihlava',
      'Karlovy Vary',
      'Kolín',
    ]) {
      expect(names).toContain(name);
    }
  });

  it('has unique names and slugs built from them, apart from the catalog', () => {
    const names = czechTowns.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    const catalogSlugs = new Set<string>(demoLocalities.map((l) => l.slug));
    const catalogNames = new Set<string>(demoLocalities.map((l) => l.name));
    for (const town of czechTowns) {
      expect(town.slug).toBe(toSlug(town.name));
      expect(catalogSlugs).not.toContain(town.slug);
      expect(catalogNames).not.toContain(town.name);
    }
    expect(new Set(czechTowns.map((t) => t.slug)).size).toBe(czechTowns.length);
  });

  it('lies in Czechia', () => {
    for (const town of czechTowns) {
      expect(town.lat).toBeGreaterThan(48.5);
      expect(town.lat).toBeLessThan(51.1);
      expect(town.lng).toBeGreaterThan(12.0);
      expect(town.lng).toBeLessThan(18.9);
    }
  });
});
