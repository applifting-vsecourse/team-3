import { text } from 'node:stream/consumers';
import { EventNotificationEmail } from '@/core/email/templates/event-notification';
import { invitationEvent } from '@/modules/notification/testing/rating-invitation.fixture';
import * as React from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { composeRatingInvitation } from './rating-invitation';

describe('rendered rating invitation', () => {
  it.each(['participant', 'organizer'] as const)(
    'renders the %s mail in the shared brand, with an escaped title and two direct links',
    async (role) => {
      const event = {
        ...invitationEvent(),
        title: '<script>alert(1)</script>',
      };
      const message = composeRatingInvitation(
        event,
        role,
        'https://hobbyhub.test',
      );
      const { prelude } = await prerenderToNodeStream(
        React.createElement(EventNotificationEmail, message.email),
      );
      const html = await text(prelude);
      expect(html).toContain('lang="cs"');
      expect(html).toContain('>HobbyHub</p>');
      expect(html).toContain('background-color:rgb(185,245,60)');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toContain('<script>');
      expect(html.split(message.email.action.url)).toHaveLength(3);
      expect(html).toContain(message.email.action.label);
      expect(html).toContain('1. 12. 2026');
    },
  );
});
