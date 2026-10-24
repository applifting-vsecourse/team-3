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
  username: string;
  url: string;
}

// Czech and „ty“ like the app (DESIGN.md › Copy), gender-neutral; brand button.
export const ResetPassword = ({
  username,
  url,
}: ResetPasswordProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Nastav si nové heslo do HobbyHubu</Preview>
    <Tailwind>
      <Body lang="cs" className="bg-gray-50 font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Heading className="text-2xl font-bold text-[#14201a] m-0">
            Nové heslo
          </Heading>
          <Text className="text-[#14201a] text-base leading-6 mt-4">
            Ahoj {username}, přišla nám žádost o nové heslo k tvému účtu v
            HobbyHubu. Nové si nastavíš tlačítkem níže.
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
          <Text className="text-blue-600 text-sm break-all">{url}</Text>
          <Hr className="border-[#e1e7dc] my-6" />
          <Text className="text-[#5b6860] text-xs">
            Nečekáš tenhle e-mail? Klidně ho ignoruj, heslo zůstane stejné.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default ResetPassword;
