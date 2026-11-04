import {
  communityEventPlans,
  isPrague,
  nearTown,
  rankCandidates,
} from './community-data';
import { allGroups, groupRecipes } from './group-events-data';
import { pastEvents, PastEventSource } from './rating-data';
import { REGIONAL_CITIES } from './regional-data';
import { stableHash } from './stable-hash';

/**
 * Další proběhlé akce s hodnocením (#181): historie v profilu (#178), proběhlé
 * akce skupin (#70) a filtr Proběhlé (#61). Ručně připravené případy pro profil
 * Petry a Jakuba zůstávají v rating-data.ts.
 *
 * - Krajská města a Praha: akce, které se tam konají, proběhly i dřív (stejný
 *   název, místo a organizátor), každá desátá je zrušená.
 * - Skupiny: veřejná a členská proběhlá akce každé aktivní skupiny.
 * - Akce, na kterou by se nesešlo minimum lidí, je zrušená („sešlo se nás málo“),
 *   ne proběhlá s hodnocením.
 * - Hodnocení: většina účastníků hodnotí akci a organizátora, organizátor
 *   většinu účastníků. Většina hvězdiček je 4–5, pár organizátorů a skupin
 *   má výrazně horší průměr (sekce „od dobře hodnocených organizátorů“, #182).
 * - Petra a Jakub (PROFILE_SHOWCASE) tu hodnocení účastníka nedostanou a Petra
 *   tu nepořádá nic mimo skupinu, aby jejich průměry z rating-data.ts platily.
 * - Nikdo nemá dvě proběhlé akce v jeden den, ani s akcemi z rating-data.ts.
 */

/** Demo účty, jejichž průměry popisuje rating-data.ts. */
export const PROFILE_SHOWCASE = new Set(['uzivatel', 'organizator']);

/** Proběhlé akce jsou 2 až 56 dní před seedem. */
const MAX_DAYS_AGO = 56;
const PRAGUE_PAST_EVENTS = 6;
const CITY_PAST_EVENTS = 4;

const goodComments = [
  'Skvělá parta, příště zase.',
  'Všechno klaplo, díky za organizaci.',
  'Přesně podle popisu, doporučuju.',
  'Pohodová atmosféra a dobře zvolené místo.',
  'Organizátor myslel na všechno.',
];
const weakComments = [
  'Začali jsme o půl hodiny později a nikdo nic nevěděl.',
  'Místo bylo jiné, než stálo v popisu.',
  'Polovina lidí nepřišla a organizátor to neřešil.',
];
// Co organizátor napíše účastníkovi (PO 4. 11.), podle hvězdiček.
const participantPraise = [
  'Spolehlivá posila, kdykoli znovu.',
  'Super nálada celý večer, díky.',
  'Pomoc s přípravou i úklidem, díky.',
];
const participantCriticism = [
  'Na začátek se čekalo bez zprávy.',
  'Odchod v půlce bez omluvy.',
];
const cancelReasons = [
  'Kvůli nemoci se akce ruší, moc se omlouvám.',
  'Hala nám zrušila rezervaci, náhradní termín dám vědět.',
  'Kvůli počasí ruším, venku by to nebylo bezpečné.',
];
const tooFewReason = 'Sešlo se nás málo, akci ruším. Příště to snad vyjde.';

/** Zrušená (`reason`) akce hodnocení nemá; proběhlou hodnotí účastníci i organizátor. */
const outcome = (
  key: string,
  participantKeys: string[],
  weak: boolean,
  reason: string | undefined,
): Pick<PastEventSource, 'ratings' | 'participantRatings' | 'cancelReason'> =>
  reason
    ? { cancelReason: reason, ratings: [], participantRatings: [] }
    : rate(key, participantKeys, weak);

const pick = <T>(pool: T[], seed: string): T =>
  pool[stableHash(seed) % pool.length];

/** Organizátor nebo skupina s výrazně horším hodnocením. */
const isWeak = (who: string): boolean => stableHash(`quality ${who}`) % 8 === 0;

/** Hodnocení akce: kdo hodnotil akci a organizátora, koho hodnotil organizátor. */
const rate = (
  key: string,
  participantKeys: string[],
  weak: boolean,
): Pick<PastEventSource, 'ratings' | 'participantRatings'> => ({
  ratings: participantKeys
    .filter((userKey) => stableHash(`${key} ${userKey} r`) % 4 !== 0)
    .map((userKey) => {
      const h = stableHash(`${key} ${userKey} stars`);
      const organizerStars = weak ? 2 + (h % 2) : h % 3 === 0 ? 4 : 5;
      const eventStars = Math.max(1, organizerStars - (h % 5 === 0 ? 1 : 0));
      return {
        userKey,
        eventStars,
        organizerStars,
        comment:
          h % 4 === 0
            ? pick(weak ? weakComments : goodComments, `${key} ${userKey}`)
            : undefined,
      };
    }),
  participantRatings: participantKeys
    .filter(
      (userKey) =>
        !PROFILE_SHOWCASE.has(userKey) &&
        stableHash(`${key} ${userKey} pr`) % 10 < 7,
    )
    .map((userKey) => {
      const stars = [5, 5, 5, 5, 5, 4, 4, 4, 3, 2][
        stableHash(`${key} ${userKey} ps`) % 10
      ];
      return {
        userKey,
        stars,
        comment:
          stableHash(`${key} ${userKey} pc`) % 5 === 0
            ? pick(
                stars >= 4 ? participantPraise : participantCriticism,
                `${key} ${userKey} pc`,
              )
            : undefined,
      };
    }),
});

const buildPastEvents = (): PastEventSource[] => {
  // kdo kdy (dny před seedem) už na proběhlé akci byl
  const busy = new Map<string, Set<number>>();
  const isBusy = (userKey: string, daysAgo: number): boolean =>
    busy.get(userKey)?.has(daysAgo) ?? false;
  const markBusy = (userKeys: string[], daysAgo: number): void =>
    userKeys.forEach((userKey) =>
      busy.set(userKey, (busy.get(userKey) ?? new Set()).add(daysAgo)),
    );
  pastEvents.forEach((e) =>
    markBusy([e.organizerKey, ...e.participantKeys], e.daysAgo),
  );
  /** První den od „náhodného“ startu, kdy organizátor na žádné akci nebyl. */
  const freeDay = (key: string, organizerKey: string): number => {
    const start = stableHash(`${key} day`) % (MAX_DAYS_AGO - 1);
    for (let d = 0; d < MAX_DAYS_AGO - 1; d++) {
      const daysAgo = 2 + ((start + d) % (MAX_DAYS_AGO - 1));
      if (!isBusy(organizerKey, daysAgo)) return daysAgo;
    }
    throw new Error(`${organizerKey} has no free day for ${key}`);
  };

  const events: PastEventSource[] = [];

  for (const city of REGIONAL_CITIES) {
    const plans = communityEventPlans
      .filter((p) =>
        city === 'praha' ? isPrague(p.localitySlug) : p.localitySlug === city,
      )
      .sort((a, b) => stableHash(a.key) - stableHash(b.key))
      .slice(0, city === 'praha' ? PRAGUE_PAST_EVENTS : CITY_PAST_EVENTS);
    for (const plan of plans) {
      const key = `p-${plan.key}`;
      const daysAgo = freeDay(key, plan.organizerKey);
      const wanted = Math.min(plan.max, plan.min + (stableHash(key) % 3));
      const participantKeys = rankCandidates(
        { ...plan, key },
        (userKey) => userKey === plan.organizerKey || isBusy(userKey, daysAgo),
      )
        .slice(0, wanted)
        .map((user) => user.key);
      markBusy([plan.organizerKey, ...participantKeys], daysAgo);
      const reason =
        participantKeys.length < plan.min
          ? tooFewReason
          : stableHash(`${key} cancel`) % 10 === 0
            ? pick(cancelReasons, key)
            : undefined;
      events.push({
        key,
        title: plan.title,
        description: plan.description,
        activitySlug: plan.activitySlug,
        daysAgo,
        time: plan.time,
        durationMinutes: plan.durationMinutes,
        address: plan.address,
        localitySlug: plan.localitySlug,
        ...nearTown(plan.localitySlug, plan.key),
        minParticipants: plan.min,
        maxParticipants: plan.max,
        organizerKey: plan.organizerKey,
        participantKeys,
        ...outcome(key, participantKeys, isWeak(plan.organizerKey), reason),
      });
    }
  }

  for (const recipe of groupRecipes) {
    const group = allGroups.find((g) => g.key === recipe.groupKey)!;
    const organizerKey = group.members.find(
      (m) => m.role === 'admin' && m.status === 'active',
    )!.userKey;
    const members = group.members
      .filter((m) => m.status === 'active' && m.userKey !== organizerKey)
      .map((m) => m.userKey);
    for (const index of [2, 3]) {
      const key = `pge-${recipe.groupKey}-${index}`;
      const daysAgo = freeDay(key, organizerKey);
      const wanted = Math.min(
        recipe.max,
        recipe.min + (stableHash(`${key} count`) % 4),
      );
      const participantKeys = members
        .filter((userKey) => !isBusy(userKey, daysAgo))
        .slice(0, wanted);
      markBusy([organizerKey, ...participantKeys], daysAgo);
      events.push({
        key,
        title: recipe.titles[index],
        description: recipe.description,
        activitySlug: group.activitySlug,
        daysAgo,
        time: recipe.time,
        durationMinutes: recipe.durationMinutes,
        address: recipe.address,
        localitySlug: group.localitySlug,
        ...nearTown(group.localitySlug, key),
        minParticipants: recipe.min,
        maxParticipants: recipe.max,
        organizerKey,
        participantKeys,
        groupKey: recipe.groupKey,
        visibility: index === 2 ? 'public' : 'members',
        ...outcome(
          key,
          participantKeys,
          isWeak(recipe.groupKey),
          participantKeys.length < recipe.min ? tooFewReason : undefined,
        ),
      });
    }
  }

  return events;
};

export const generatedPastEvents: PastEventSource[] = buildPastEvents();
