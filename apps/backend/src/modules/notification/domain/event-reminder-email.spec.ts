import { text } from 'node:stream/consumers';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import { reminderEvent } from '@/modules/notification/testing/event-reminder.fixture';
import * as React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import {
  composeOrganizerOverview,
  composeParticipantReminder,
} from './event-reminder';

const now = new Date('2026-11-27T18:00:00Z');
const render = async (
  email: React.ComponentProps<typeof EventNotificationEmail>,
): Promise<string> => {
  const { prelude } = await prerenderToNodeStream(
    React.createElement(EventNotificationEmail, email),
  );
  return text(prelude);
};

describe('rendered reminders before an event', () => {
  it('the participant reminder links the event and escapes its title', async () => {
    const event = { ...reminderEvent(), title: '<script>alert(1)</script>' };
    const { email } = composeParticipantReminder(
      event,
      now,
      'https://hobbyhub.test',
    );
    const html = await render(email);
    expect(html).toContain('lang="cs"');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    // the button and the copyable link
    expect(html.split('https://hobbyhub.test/akce/event-1"')).toHaveLength(2);
    expect(html).toContain('>https://hobbyhub.test/akce/event-1<');
    expect(html).toContain('Herna Karlín, Praha');
  });

  it('the organizer overview has the event link and „Zrušit akci“ to its management', async () => {
    const { email } = composeOrganizerOverview(
      reminderEvent(),
      now,
      'https://hobbyhub.test',
      false,
    );
    const html = await render(email);
    expect(html).toContain('Do minima chybí 2 lidé');
    expect(html).toContain('href="https://hobbyhub.test/akce/event-1"');
    expect(html).toContain('Sdílet odkaz');
    expect(html).toContain('href="https://hobbyhub.test/akce/event-1/sprava"');
    expect(html).toContain('Zrušit akci');
    expect(html).not.toContain('Topovat');
  });
});
