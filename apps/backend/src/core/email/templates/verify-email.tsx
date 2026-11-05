import { Button, Heading, Section, Text } from 'react-email';
import * as React from 'react';
import { EmailLayout } from './layout';

export interface VerifyEmailProps {
  url: string;
}

// Czech and „ty“ like the app (DESIGN.md › Copy); the frame is the shared layout.
export const VerifyEmail = ({ url }: VerifyEmailProps): React.JSX.Element => (
  <EmailLayout
    preview="Odkaz platí 24 hodin."
    footnote="Tenhle e-mail ti nic neříká? Klidně ho ignoruj, dokud na odkaz neklepneš, nic se neověří."
  >
    <Heading className="text-2xl font-bold text-[#14201a] m-0">
      Vítej v HobbyHubu
    </Heading>
    <Text className="text-[#14201a] text-base leading-6 mt-4">
      Klepni na tlačítko a ověř si e-mailovou adresu. Pak se můžeš hlásit na
      akce a zakládat vlastní akce i skupiny.
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
      Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz. Platí
      24 hodin.
    </Text>
    <Text className="text-[#14201a] underline text-sm break-all">{url}</Text>
  </EmailLayout>
);

export default VerifyEmail;
