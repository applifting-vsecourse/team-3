import { Button, Heading, Section, Text } from 'react-email';
import * as React from 'react';
import { EmailLayout } from './layout';

export interface EventNotificationEmailProps {
  preview: string;
  heading: string;
  paragraphs: string[];
  /** „Termín: …“, „Místo: …“; shown as a short list under the text. */
  details: { label: string; value: string }[];
  /** What somebody wrote (the reason for a cancellation, a request message). */
  quote: { label: string; text: string } | null;
  /** The button, and the same link as text for clients that block buttons. */
  action: { label: string; url: string };
}

/**
 * One template for every e-mail about an event (#177): the text comes from
 * `composeMessage`, so what the user reads is tested apart from the markup.
 * Texts written by users are React children, so they are escaped.
 */
export const EventNotificationEmail = ({
  preview,
  heading,
  paragraphs,
  details,
  quote,
  action,
}: EventNotificationEmailProps): React.JSX.Element => (
  <EmailLayout preview={preview}>
    <Heading className="text-2xl font-bold text-[#14201a] m-0">
      {heading}
    </Heading>
    {paragraphs.map((paragraph) => (
      <Text
        key={paragraph}
        className="text-[#14201a] text-base leading-6 mt-4 mb-0"
        // a group announcement's lines stay as the admin wrote them (#194)
        style={{ whiteSpace: 'pre-line' }}
      >
        {paragraph}
      </Text>
    ))}
    {details.map(({ label, value }) => (
      <Text
        key={label}
        className="text-[#14201a] text-base leading-6 mt-2 mb-0"
      >
        <strong>{`${label}:`}</strong> {value}
      </Text>
    ))}
    {quote ? (
      <Section className="bg-[#f4f1e8] rounded-lg px-4 py-3 mt-6">
        <Text className="text-[#505e56] text-xs m-0">{quote.label}</Text>
        <Text
          className="text-[#14201a] text-base leading-6 mt-1 mb-0"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {quote.text}
        </Text>
      </Section>
    ) : null}
    <Section className="text-center my-8">
      <Button
        href={action.url}
        className="bg-[#b9f53c] text-[#14201a] border border-solid border-[#265212] font-semibold rounded-lg px-6 py-3"
      >
        {action.label}
      </Button>
    </Section>
    <Text className="text-[#505e56] text-sm leading-5">
      Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz.
    </Text>
    <Text className="text-[#14201a] underline text-sm break-all">
      {action.url}
    </Text>
  </EmailLayout>
);

export default EventNotificationEmail;
