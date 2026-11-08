/**
 * Oznámení správců členům skupiny (#194). Ukázka pro demo #47: Tomáš
 * (`spravce`) psal do skupiny, kde je Jakub (`uzivatel`) členem, takže
 * Jakub vidí sekci Oznámení na stránce skupiny, a do neveřejné skupiny,
 * kde Jakubova žádost čeká, takže ji tam nevidí. Texty jsou ilustrační
 * a bez dat v kalendáři, aby nezestárly.
 *
 * Pravidla, která hlídá group-announcements-data.spec.ts: skupina existuje
 * a je aktivní, autor je její aktivní správce, předmět a text se vejdou do
 * limitů API a žádné oznámení není z dne seedu (nezabírá dnešní limit).
 */
export type SeedAnnouncement = {
  groupKey: string;
  senderKey: string;
  subject: string;
  body: string;
  /** Kolik dní před seedem přišlo. */
  daysAgo: number;
};

export const groupAnnouncements: SeedAnnouncement[] = [
  {
    groupKey: 'g-florbal',
    senderKey: 'spravce',
    subject: 'Změna šatny',
    body: 'Od příští hry se převlékáme v šatně č. 3, naše se opravuje.\nKlíč je na vrátnici, stačí říct, že jdete na florbal.',
    daysAgo: 2,
  },
  {
    groupKey: 'g-florbal',
    senderKey: 'spravce',
    subject: 'Brankářská výstroj k zapůjčení',
    body: 'Kdo nemá vlastní výstroj a chce si zkusit bránu, může si půjčit tu skupinovou.\n\nNapiš mi den předem, ať ji přivezu.',
    daysAgo: 9,
  },
  {
    groupKey: 'g-florbal-pokrocili',
    senderKey: 'spravce',
    subject: 'Doplňujeme sestavu',
    body: 'Hledáme jednoho obránce na středy. Kdo zná někoho šikovného, ať mu pošle odkaz na skupinu.',
    daysAgo: 4,
  },
];
