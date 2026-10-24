import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';

export interface VerifyEmailProps {
  url: string;
}

// Czech and „ty“ like the app (DESIGN.md › Copy); the button in the brand
// colours (--primary, --primary-foreground), as e-mails can't read CSS variables.
export const VerifyEmail = ({ url }: VerifyEmailProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Ověř si e-mail a můžeš se hlásit na akce</Preview>
    <Tailwind>
      <Body lang="cs" className="bg-gray-50 font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Heading className="text-2xl font-bold text-[#14201a] m-0">
            Vítej v HobbyHubu
          </Heading>
          <Text className="text-[#14201a] text-base leading-6 mt-4">
            Klepni na tlačítko a ověř si e-mailovou adresu. Pak se můžeš hlásit
            na akce a zakládat vlastní akce i skupiny.
          </Text>
          <Section className="text-center my-8">
            <Button
              href={url}
              className="bg-[#b6f24a] text-[#14201a] font-semibold rounded-lg px-6 py-3"
            >
              Ověřit e-mail
            </Button>
          </Section>
          <Text className="text-[#5b6860] text-sm leading-5">
            Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz.
            Platí 24 hodin.
          </Text>
          <Text className="text-blue-600 text-sm break-all">{url}</Text>
          <Hr className="border-[#e1e7dc] my-6" />
          <Text className="text-[#5b6860] text-xs">
            Nečekáš tenhle e-mail? Klidně ho ignoruj, bez klepnutí na odkaz se
            nic neověří.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
