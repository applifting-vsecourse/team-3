import { ROUTES } from "@/app/routes"

import { LegalArticle, LegalList, LegalSection } from "@/features/legal/components/LegalArticle"

/** #153: what signing up agrees to. Short and true: a student project, no company behind it. */
export function TermsOfUse() {
  return (
    <LegalArticle
      title="Podmínky užívání"
      lead="Co je HobbyHub a co od tebe při jeho používání čekáme."
      seeAlso={{ to: ROUTES.privacy, label: "Zpracování osobních údajů" }}
    >
      <LegalSection title="Co je HobbyHub">
        <p>
          HobbyHub je studentský projekt, který vzniká při výuce na Vysoké škole ekonomické v Praze
          (VŠE). Pomáhá najít lidi na amatérské volnočasové akce a takové akce pořádat. Nestojí za
          ním žádná firma a za jeho používání nic neplatíš.
        </p>
      </LegalSection>

      <LegalSection title="Je to výukový projekt">
        <p>
          HobbyHub se pořád vyvíjí. Něco v něm nemusí fungovat, může na chvíli vypadnout a data se
          můžou smazat nebo nahradit testovacími. Nic z toho nezaručujeme, tak na něm nestav nic,
          bez čeho se neobejdeš.
        </p>
      </LegalSection>

      <LegalSection title="Tvůj účet">
        <LegalList>
          <li>Zaregistruj se pod svým jménem a s e-mailem, který používáš.</li>
          <li>Heslo nikomu nedávej. Co se pod tvým účtem stane, jde za tebou.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Akce a skupiny">
        <LegalList>
          <li>
            Akce a skupiny zakládají uživatelé, ne HobbyHub. Za akci, její místo a průběh odpovídá
            její organizátor.
          </li>
          <li>
            Na akce chodíš na vlastní odpovědnost. HobbyHub je nekontroluje a za to, co se na nich
            stane, neručí.
          </li>
          <li>Když na akci nakonec nemůžeš, odhlas se, ať místo dostane někdo jiný.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Co nedělej">
        <p>
          Nepiš nic nezákonného, urážlivého ani klamavého, neposílej spam a nevydávej se za někoho
          jiného. Takový obsah může správce aplikace skrýt a účet zablokovat.
        </p>
      </LegalSection>

      <LegalSection title="Změny">
        <p>
          Podmínky se můžou s vývojem projektu změnit. Platnou verzi najdeš vždy na této stránce.
        </p>
      </LegalSection>
    </LegalArticle>
  )
}
