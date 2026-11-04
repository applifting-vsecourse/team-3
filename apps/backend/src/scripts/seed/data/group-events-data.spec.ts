import { allGroups, groupEvents, groupRecipes } from './group-events-data';
import { generatedPastEvents } from './past-data';

// Kontroly akcí skupin (#181, AK 4): každá aktivní skupina pořádá veřejné akce
// i akce jen pro členy, nadcházející i proběhlé, a nerozbijí živé demo #47.

const activeGroups = allGroups.filter((g) => g.status === 'active');
const pastGroupEvents = generatedPastEvents.filter((e) => e.groupKey);

describe('group events (#181)', () => {
  it('has a recipe for every active group and none for an inactive one', () => {
    expect(groupRecipes.map((r) => r.groupKey).sort()).toEqual(
      activeGroups.map((g) => g.key).sort(),
    );
  });

  it('gives every active group an upcoming and a past event, public and members-only', () => {
    for (const group of activeGroups) {
      for (const events of [
        groupEvents.filter((e) => e.groupKey === group.key),
        pastGroupEvents.filter((e) => e.groupKey === group.key),
      ]) {
        expect(`${group.key} ${events.map((e) => e.visibility).sort()}`).toBe(
          `${group.key} members,public`,
        );
      }
    }
  });

  it('lets an active admin organize and active members join, within capacity', () => {
    for (const event of groupEvents) {
      const group = allGroups.find((g) => g.key === event.groupKey)!;
      const active = new Set(
        group.members
          .filter((m) => m.status === 'active')
          .map((m) => m.userKey),
      );
      expect(
        group.members.some(
          (m) =>
            m.userKey === event.organizerKey &&
            m.role === 'admin' &&
            m.status === 'active',
        ),
      ).toBe(true);
      for (const p of event.participations) {
        expect(`${event.key} ${p.userKey} ${active.has(p.userKey)}`).toBe(
          `${event.key} ${p.userKey} true`,
        );
        expect(p.userKey).not.toBe(event.organizerKey);
      }
      expect(event.participations.length).toBeLessThanOrEqual(
        event.maxParticipants,
      );
      expect(event.localitySlug).toBe(group.localitySlug);
      expect(event.activitySlug).toBe(group.activitySlug);
    }
  });

  // pražské akce v prvních 8 dnech nesmí chybět lidi a deskovky v Praze jsou až
  // po 8 dnech (#47 demo, viz community-data.ts)
  it('starts no upcoming group event within 8 days of the seed', () => {
    for (const event of groupEvents) {
      expect(event.schedule.daysFromNow).toBeGreaterThanOrEqual(9);
    }
  });

  it('keeps titles free of weekdays and occupancy states, texts free of placeholders', () => {
    const weekdays =
      /pondělí|úter[ýk]|střed[auy]|čtvrtek|pátek|sobot|neděl|víkend/i;
    const states = /chybí|volná místa|volné místo|plno|obsazeno/i;
    for (const recipe of groupRecipes) {
      for (const title of recipe.titles) {
        expect(title).not.toMatch(weekdays);
        expect(title).not.toMatch(states);
        expect(title).not.toMatch(/test|qa|lorem/i);
      }
      expect(recipe.description).not.toMatch(weekdays);
      expect(recipe.description).not.toMatch(/test|qa|lorem/i);
      expect(
        recipe.description
          .split(/[.!?](\s|$)/)
          .filter((s) => s.trim().length > 1).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });
});
