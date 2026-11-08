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

// Czech and „ty“ like the app (DESIGN.md › Copy), in the app's colours
// (--background, --card + --card-border, --primary with its --primary-edge outline,
// --primary-foreground, --muted-foreground, --border)
// written out, as e-mails can't read CSS variables.
export const VerifyEmail = ({ url }: VerifyEmailProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Odkaz platí 24 hodin.</Preview>
    <Tailwind>
      <Body lang="cs" className="bg-[#f4f1e8] font-sans py-10">
        <Container className="bg-white border border-solid border-[#847e70] rounded-lg mx-auto p-8 max-w-xl">
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
              className="bg-[#b9f53c] text-[#14201a] border border-solid border-[#265212] font-semibold rounded-lg px-6 py-3"
            >
              Ověřit e-mail
            </Button>
          </Section>
          <Text className="text-[#505e56] text-sm leading-5">
            Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz.
            Platí 24 hodin.
          </Text>
          <Text className="text-[#14201a] underline text-sm break-all">
            {url}
          </Text>
          <Hr className="border-[#847e70] my-6" />
          <Text className="text-[#505e56] text-xs">
            Tenhle e-mail ti nic neříká? Klidně ho ignoruj, dokud na odkaz
            neklepneš, nic se neověří.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
