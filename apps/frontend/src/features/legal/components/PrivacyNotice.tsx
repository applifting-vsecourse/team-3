import { ROUTES } from "@/app/routes"

import { LegalArticle, LegalList, LegalSection } from "@/features/legal/components/LegalArticle"

/** #153: what the sign-up asks to acknowledge. Only what the app really stores and shows. */
export function PrivacyNotice() {
  return (
    <LegalArticle
      title="Zpracování osobních údajů"
      lead="Jaké údaje o tobě HobbyHub má, k čemu je potřebuje a kdo je uvidí."
      seeAlso={{ to: ROUTES.terms, label: "Podmínky užívání" }}
    >
      <LegalSection title="Kdo s údaji pracuje">
        <p>
          HobbyHub je studentský projekt, který vyvíjí tým studentů při výuce na Vysoké škole
          ekonomické v Praze (VŠE). Tvoje údaje má jen tento projekt. Není za ním žádná firma a
          údaje nikomu neprodáváme ani je nedáváme kvůli reklamě.
        </p>
      </LegalSection>

      <LegalSection title="Jaké údaje máme">
        <LegalList>
          <li>Jméno a e-mail z registrace.</li>
          <li>
            Heslo, ale ne v čitelné podobě: jen jeho otisk (hash), ze kterého se heslo zpátky
            zjistit nedá.
          </li>
          <li>Akce a skupiny, které zakládáš nebo na které se hlásíš.</li>
          <li>Čas souhlasu s podmínkami užívání.</li>
          <li>
            Kvůli přihlášení přihlašovací cookie a u každého přihlášení IP adresu a typ prohlížeče.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="K čemu je potřebujeme">
        <p>
          Jen k tomu, aby HobbyHub fungoval: aby šlo přihlásit, aby organizátor věděl, kdo na akci
          jde, a abychom ti mohli poslat e-mail k účtu, třeba odkaz na ověření adresy nebo na nové
          heslo.
        </p>
      </LegalSection>

      <LegalSection title="Kdo je uvidí">
        <LegalList>
          <li>Tvoje jméno uvidí ostatní uživatelé u akcí a skupin, kterých se účastníš.</li>
          <li>E-mail ostatním uživatelům neukazujeme.</li>
          <li>Ke všem údajům má přístup tým projektu, který aplikaci spravuje.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Služby, přes které HobbyHub běží">
        <LegalList>
          <li>
            E-maily k účtu odcházejí přes e-mailovou službu, která k tomu potřebuje tvou adresu.
          </li>
          <li>
            Mapa a našeptávač míst se načítají ze služeb OpenStreetMap a Photon. Tvůj prohlížeč se k
            nim připojuje, takže vidí tvou IP adresu, ne tvůj účet.
          </li>
          <li>Reklamní ani analytické cookies nepoužíváme.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Jak dlouho">
        <p>Údaje máme, dokud máš účet. Jde o výukový projekt, takže se data můžou smazat i dřív.</p>
      </LegalSection>

      <LegalSection title="Tvoje práva">
        <p>
          Můžeš chtít vědět, jaké údaje o tobě máme, nechat je opravit nebo je smazat i s účtem.
          Smazání účtu přímo v aplikaci zatím chybí, proto se s tím obrať na tým projektu.
        </p>
      </LegalSection>
    </LegalArticle>
  )
}
