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
 * app's colours (--primary, --primary-foreground, --muted-foreground,
 * --border) written out, as e-mails can't read CSS variables.
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
      <Body lang="cs" className="bg-[#f2f5ef] font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Text className="text-[#14201a] text-sm font-bold m-0 mb-6">
            HobbyHub
          </Text>
          {children}
          <Hr className="border-[#e1e7dc] my-6" />
          {footnote ? (
            <Text className="text-[#5b6860] text-xs">{footnote}</Text>
          ) : null}
          <Text className="text-[#5b6860] text-xs m-0">
            Tenhle e-mail ti poslal HobbyHub.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default EmailLayout;
