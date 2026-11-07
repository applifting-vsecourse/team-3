import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';

export interface EmailLayoutProps {
  /** The line mail clients show next to the subject. */
  preview: string;
  /** Small print above the footer, e.g. „Tenhle e-mail ti nic neříká?“. */
  footnote?: string;
  children: React.ReactNode;
}

/**
 * The frame every HobbyHub e-mail shares (B-040): the brand on top, the
 * content, a footer. Czech and „ty“ like the app (DESIGN.md › Copy), in the
 * app's colours from global.css (--background, --card + --card-border,
 * --primary with its --primary-edge outline, --primary-foreground,
 * --muted-foreground, --border) written out, as e-mails can't read CSS
 * variables.
 */
export const EmailLayout = ({
  preview,
  footnote,
  children,
}: EmailLayoutProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind>
      <Body lang="cs" className="bg-[#f4f1e8] font-sans py-10">
        <Container className="bg-white border border-solid border-[#847e70] rounded-lg mx-auto p-8 max-w-xl">
          <Text className="text-[#14201a] text-sm font-bold m-0 mb-6">
            HobbyHub
          </Text>
          {children}
          <Hr className="border-[#847e70] my-6" />
          {footnote ? (
            <Text className="text-[#505e56] text-xs">{footnote}</Text>
          ) : null}
          <Text className="text-[#505e56] text-xs m-0">
            Tenhle e-mail ti poslal HobbyHub.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default EmailLayout;
