import {
  composeAnnouncement,
  composeEventMessage,
  composeMessage,
  MessageContext,
} from './messages';
import { NotifiedEvent } from './notification';

const event: NotifiedEvent = {
  id: 'e1',
  title: 'Deskovky ve středu',
  startsAt: new Date('2026-11-11T17:00:00.000Z'),
  endsAt: null,
  address: 'Herna Karlín, Křižíkova 52, Praha 8',
  cancelReason: null,
  approvedCount: 3,
  maxParticipants: 6,
  organizerId: 'u1',
};

const context = (overrides: Partial<MessageContext> = {}): MessageContext => ({
  event,
  person: { name: 'Jana Nováková' },
  frontendUrl: 'https://hobbyhub.example/',
  ...overrides,
});

const textOf = (message: ReturnType<typeof composeMessage>): string =>
  [
    message.subject,
    message.email.preview,
    message.email.heading,
    ...message.email.paragraphs,
    ...message.email.details.map(({ label, value }) => `${label}: ${value}`),
    message.email.quote?.text ?? '',
  ].join('\n');

describe('composeMessage', () => {
  it('an approved request says the user has a place, with the time and the place', () => {
    const message = composeMessage(
      {
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'approved',
      },
      context({ person: null }),
    );

    expect(message.subject).toBe('Máš místo na akci: Deskovky ve středu');
    expect(message.email.heading).toBe('Máš místo');
    expect(message.email.paragraphs[0]).toBe(
      'Tvoje žádost o účast na akci „Deskovky ve středu“ byla schválena.',
    );
    expect(message.email.details).toEqual([
      { label: 'Termín', value: 'st 11. 11. 2026 v 18:00' },
      { label: 'Místo', value: 'Herna Karlín, Křižíkova 52, Praha 8' },
    ]);
    expect(message.email.action).toEqual({
      label: 'Zobrazit akci',
      url: 'https://hobbyhub.example/akce/e1',
    });
  });

  it('a rejected request says so without blaming anyone and points to the event', () => {
    const message = composeMessage(
      {
        type: 'request-decided',
        eventId: 'e1',
        userIds: ['u2'],
        outcome: 'rejected',
      },
      context({ person: null }),
    );

    expect(message.subject).toBe(
      'Žádost o účast nebyla přijata: Deskovky ve středu',
    );
    expect(message.email.paragraphs[0]).toBe(
      'Tvoje žádost o účast na akci „Deskovky ve středu“ nebyla přijata.',
    );
    expect(message.email.action.url).toBe('https://hobbyhub.example/akce/e1');
  });

  it('a new time tells the new and the old one, and what to do if it does not suit', () => {
    const message = composeMessage(
      {
        type: 'event-changed',
        eventId: 'e1',
        change: {
          when: {
            from: { startsAt: event.startsAt, endsAt: null },
            to: {
              startsAt: new Date('2026-11-12T17:00:00.000Z'),
              endsAt: null,
            },
          },
          place: null,
        },
      },
      context({ person: null }),
    );

    expect(message.subject).toBe('Změna u akce: Deskovky ve středu');
    expect(message.email.paragraphs[0]).toBe(
      'U akce „Deskovky ve středu“ se změnil termín.',
    );
    expect(message.email.paragraphs[1]).toContain('odhlas se z akce');
    expect(message.email.details).toEqual([
      {
        label: 'Nový termín',
        value: 'čt 12. 11. 2026 v 18:00 (dříve st 11. 11. 2026 v 18:00)',
      },
    ]);
  });

  it('a new place tells the new and the old one; time and place together say both', () => {
    const place = {
      from: 'Herna Karlín, Křižíkova 52, Praha 8',
      to: 'Kavárna Louvre, Praha 1',
    };
    const placeOnly = composeMessage(
      { type: 'event-changed', eventId: 'e1', change: { when: null, place } },
      context({ person: null }),
    );
    const both = composeMessage(
      {
        type: 'event-changed',
        eventId: 'e1',
        change: {
          when: {
            from: { startsAt: event.startsAt, endsAt: null },
            to: {
              startsAt: event.startsAt,
              endsAt: new Date('2026-11-11T19:00:00.000Z'),
            },
          },
          place,
        },
      },
      context({ person: null }),
    );

    expect(placeOnly.email.paragraphs[0]).toBe(
      'U akce „Deskovky ve středu“ se změnilo místo.',
    );
    expect(placeOnly.email.details).toEqual([
      {
        label: 'Nové místo',
        value:
          'Kavárna Louvre, Praha 1 (dříve Herna Karlín, Křižíkova 52, Praha 8)',
      },
    ]);
    expect(both.email.paragraphs[0]).toBe(
      'U akce „Deskovky ve středu“ se změnil termín i místo.',
    );
    expect(both.email.details.map(({ label }) => label)).toEqual([
      'Nový termín',
      'Nové místo',
    ]);
  });

  it('a moved pin with the same address says the position changed', () => {
    const message = composeMessage(
      {
        type: 'event-changed',
        eventId: 'e1',
        change: {
          when: null,
          place: { from: event.address, to: event.address },
        },
      },
      context({ person: null }),
    );

    expect(message.email.details).toEqual([
      {
        label: 'Místo',
        value: `${event.address} (poloha na mapě se změnila)`,
      },
    ]);
  });

  it('a cancellation says what was cancelled and quotes the reason', () => {
    const message = composeMessage(
      { type: 'event-cancelled', eventId: 'e1' },
      context({
        person: null,
        event: { ...event, cancelReason: 'Herna má zavřeno.' },
      }),
    );

    expect(message.subject).toBe('Akce zrušena: Deskovky ve středu');
    expect(message.email.paragraphs[0]).toBe(
      'Akce „Deskovky ve středu“, která měla být st 11. 11. 2026 v 18:00, byla zrušena.',
    );
    expect(message.email.quote).toEqual({
      label: 'Důvod zrušení',
      text: 'Herna má zavřeno.',
    });
    expect(message.email.action.url).toBe('https://hobbyhub.example/akce/e1');
  });

  it('a cancellation without a stored reason has no quote', () => {
    const message = composeMessage(
      { type: 'event-cancelled', eventId: 'e1' },
      context({ person: null }),
    );

    expect(message.email.quote).toBeNull();
  });

  it('a new request names the applicant, quotes their message and links to the management', () => {
    const message = composeMessage(
      {
        type: 'request-received',
        eventId: 'e1',
        applicantId: 'u2',
        message: 'Hraju rád a pozvu kamaráda.',
      },
      context(),
    );

    expect(message.subject).toBe('Nová žádost o účast: Deskovky ve středu');
    expect(message.email.paragraphs[0]).toBe(
      'Jana Nováková se chce zúčastnit akce „Deskovky ve středu“. Žádost čeká na tvoje rozhodnutí.',
    );
    expect(message.email.quote).toEqual({
      label: 'Zpráva k žádosti',
      text: 'Hraju rád a pozvu kamaráda.',
    });
    expect(message.email.action).toEqual({
      label: 'Vyřídit žádost',
      url: 'https://hobbyhub.example/akce/e1/sprava',
    });
  });

  it('a request without a message has no quote; an unknown applicant is „Někdo“', () => {
    const message = composeMessage(
      {
        type: 'request-received',
        eventId: 'e1',
        applicantId: 'u2',
        message: null,
      },
      context({ person: null }),
    );

    expect(message.email.quote).toBeNull();
    expect(message.email.paragraphs[0]).toContain('Někdo se chce zúčastnit');
  });

  it('somebody leaving names them and says how many are still in', () => {
    const message = composeMessage(
      { type: 'participant-left', eventId: 'e1', participantId: 'u2' },
      context(),
    );

    expect(message.subject).toBe('Odhlášení z akce: Deskovky ve středu');
    expect(message.email.paragraphs[0]).toBe(
      'Jana Nováková už na akci „Deskovky ve středu“ nejde. Místo je zase volné.',
    );
    expect(message.email.details).toContainEqual({
      label: 'Přihlášených',
      value: '3 z 6',
    });
    expect(message.email.action.url).toBe(
      'https://hobbyhub.example/akce/e1/sprava',
    );
  });

  it('every message links to the event, is Czech and says „ty“, and names no gender of the organizer', () => {
    const messages = [
      composeMessage(
        {
          type: 'request-decided',
          eventId: 'e1',
          userIds: ['u2'],
          outcome: 'approved',
        },
        context(),
      ),
      composeMessage(
        {
          type: 'request-decided',
          eventId: 'e1',
          userIds: ['u2'],
          outcome: 'rejected',
        },
        context(),
      ),
      composeMessage(
        {
          type: 'event-changed',
          eventId: 'e1',
          change: { when: null, place: { from: 'A', to: 'B' } },
        },
        context(),
      ),
      composeMessage({ type: 'event-cancelled', eventId: 'e1' }, context()),
      composeMessage(
        {
          type: 'request-received',
          eventId: 'e1',
          applicantId: 'u2',
          message: null,
        },
        context(),
      ),
      composeMessage(
        { type: 'participant-left', eventId: 'e1', participantId: 'u2' },
        context(),
      ),
    ];

    for (const message of messages) {
      expect(message.email.action.url).toContain('/akce/e1');
      // vykání and the gendered „organizátor schválil / nepřijal“
      expect(textOf(message)).not.toMatch(
        /\b(Vaše|Vás|Vám|váš|vaši)\b|organizátor (schválil|nepřijal|zrušil)/i,
      );
    }
  });

  describe('composeAnnouncement (#194, Figma E-01 type 8)', () => {
    const announcement = {
      id: 'an1',
      subject: 'Přes svátky se nehraje',
      body: 'Poslední hra v roce bude 16. 12.\nPak pauza do 6. 1.\n\nAkce na leden založím do konce prosince.',
      senderId: 'u1',
      group: { id: 'g1', name: 'Florbal Podvinný mlýn' },
    };

    it('the subject names the group, the heading and text are the admin’s words', () => {
      const message = composeAnnouncement(
        announcement,
        'https://hobbyhub.example/',
      );

      expect(message.subject).toBe(
        'Florbal Podvinný mlýn: Přes svátky se nehraje',
      );
      expect(message.email.heading).toBe('Přes svátky se nehraje');
      // blank lines split paragraphs; a single line break stays inside one
      expect(message.email.paragraphs).toEqual([
        'Poslední hra v roce bude 16. 12.\nPak pauza do 6. 1.',
        'Akce na leden založím do konce prosince.',
      ]);
      expect(message.email.action).toEqual({
        label: 'Stránka skupiny',
        url: 'https://hobbyhub.example/skupiny/g1',
      });
    });

    it('the preview is the start of the text on one line', () => {
      const { email } = composeAnnouncement(
        { ...announcement, body: `Ahoj\nvšem. ${'a'.repeat(200)}` },
        'https://hobbyhub.example/',
      );

      expect(email.preview.startsWith('Ahoj všem. aaa')).toBe(true);
      expect(email.preview).toHaveLength(140);
      expect(email.preview.endsWith('…')).toBe(true);
    });
  });

  describe('composeEventMessage (#176, Figma E-01 type 7)', () => {
    const message = {
      id: 'm1',
      subject: 'Hrajeme v malé tělocvičně',
      body: 'Sraz v 17:50 u vchodu.\nVezmi si sálovky.\n\nMíče mám.',
      senderId: 'u1',
      event: { id: 'e1', title: 'Volejbal na Pankráci' },
    };

    it('the subject names the event, the heading and text are the organizer’s words, the button opens the detail', () => {
      const composed = composeEventMessage(
        message,
        'https://hobbyhub.example/',
      );

      expect(composed.subject).toBe(
        'Volejbal na Pankráci: Hrajeme v malé tělocvičně',
      );
      expect(composed.email.heading).toBe('Hrajeme v malé tělocvičně');
      expect(composed.email.paragraphs).toEqual([
        'Sraz v 17:50 u vchodu.\nVezmi si sálovky.',
        'Míče mám.',
      ]);
      expect(composed.email.action).toEqual({
        label: 'Detail akce',
        url: 'https://hobbyhub.example/akce/e1',
      });
      expect(composed.email.preview).toBe(
        'Sraz v 17:50 u vchodu. Vezmi si sálovky. Míče mám.',
      );
    });
  });
});
