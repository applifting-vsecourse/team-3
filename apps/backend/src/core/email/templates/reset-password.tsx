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

export interface ResetPasswordProps {
  url: string;
}

// Czech and „ty“ like the app (DESIGN.md › Copy), in the app's colours. No name in
// the greeting: Czech wants the vocative („Ahoj Petro“), which a free-text name
// can't give, and „Ahoj Petra Nováková“ reads like a mail merge.
export const ResetPassword = ({
  url,
}: ResetPasswordProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Odkaz platí hodinu.</Preview>
    <Tailwind>
      <Body lang="cs" className="bg-[#f2f5ef] font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Heading className="text-2xl font-bold text-[#14201a] m-0">
            Nové heslo
          </Heading>
          <Text className="text-[#14201a] text-base leading-6 mt-4">
            Ahoj, přišla nám žádost o nové heslo k tvému účtu v HobbyHubu. Nové
            si nastavíš tlačítkem níže.
          </Text>
          <Section className="text-center my-8">
            <Button
              href={url}
              className="bg-[#b6f24a] text-[#14201a] font-semibold rounded-lg px-6 py-3"
            >
              Nastavit nové heslo
            </Button>
          </Section>
          <Text className="text-[#5b6860] text-sm leading-5">
            Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz.
            Platí hodinu.
          </Text>
          <Text className="text-[#14201a] underline text-sm break-all">
            {url}
          </Text>
          <Hr className="border-[#e1e7dc] my-6" />
          <Text className="text-[#5b6860] text-xs">
            Žádost nebyla od tebe? Klidně tenhle e-mail ignoruj, heslo zůstane
            stejné.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default ResetPassword;
