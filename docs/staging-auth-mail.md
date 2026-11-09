# Google přihlášení a skutečné e-maily na stagingu (#165)

Podle návodu cvičících: klíče jdou z **GitHub secrets → build-args v `deploy.yml` → `ENV` v `apps/backend/Dockerfile.deploy` → běžící backend**. Do Coolify se nic nezadává. Bez nastavených hodnot se nic nemění: Google tlačítko se neukáže a e-maily jdou do simulované schránky.

Zapíná se to **ve dvou krocích**. Google přihlášení jde zapnout kdykoli. Skutečné e-maily až po rozhodnutí s PO, co s účty ověřenými simulací (viz [Na co dát pozor](#na-co-dát-pozor)).

Secrets i variables jsou v repu na GitHubu v **Settings → Secrets and variables → Actions** (záložky _Secrets_ a _Variables_). Překlep v názvu Actions nenahlásí, jen pošle prázdnou hodnotu. Změna se projeví až po novém buildu: **Actions → Build & Deploy → Run workflow** (3–5 minut). Logy backendu jsou v Dozzle (`https://logs.vsepractical.applifting.dev`).

## Krok A: Google přihlášení

1. **OAuth klient** podle [přihlášení přes Google](prihlaseni-pres-google.md), §1. U klienta musí být:
   - Authorized JavaScript origins: `https://team-3.vsepractical.applifting.dev`
   - Authorized redirect URIs: `https://team-3.vsepractical.applifting.dev/api/auth/callback/google`

   Consent screen v režimu Testing pustí jen e-maily z Test users.

2. **Secrets:**

   | Název                  | Hodnota                |
   | ---------------------- | ---------------------- |
   | `GOOGLE_CLIENT_ID`     | Client ID z Google     |
   | `GOOGLE_CLIENT_SECRET` | Client secret z Google |

3. **Run workflow**, pak ověřit: `https://team-3.vsepractical.applifting.dev/api/sign-in-providers` vrací `{"google":true}` a na `/login` je tlačítko Google. E-maily dál chodí do simulované schránky a Google se s existujícími účty nepropojuje.

## Krok B: skutečné e-maily (až po rozhodnutí s PO)

1. **Gmail pro odesílání:** účet, ze kterého budou e-maily chodit (nejlépe vlastní Gmail týmu, ne osobní). Zapnout dvoufázové ověření → Účet Google → Zabezpečení → **Hesla aplikací** → vytvořit heslo (16 znaků, bez mezer).

2. **Secrets:**

   | Název           | Hodnota                                   |
   | --------------- | ----------------------------------------- |
   | `SMTP_USERNAME` | celá adresa toho Gmailu (`…@gmail.com`)   |
   | `SMTP_PASSWORD` | heslo aplikace vytvořené v tom samém účtu |

3. **Variables** (netajné):

   | Název        | Hodnota                                                                      |
   | ------------ | ---------------------------------------------------------------------------- |
   | `SMTP_HOST`  | `smtp.gmail.com`                                                             |
   | `EMAIL_FROM` | volitelné, např. `HobbyHub <adresa Gmailu>`; bez něj odesílá `SMTP_USERNAME` |

   `SMTP_PORT` (465) a `SMTP_SECURE` (true) mají výchozí hodnoty, není potřeba je zadávat.

4. **Run workflow**, pak ověřit: registrace s vlastním e-mailem → ověřovací e-mail přijde do schránky (zkontrolovat i spam).

Jakmile jsou nastavené všechny tři hodnoty `SMTP_HOST`, `SMTP_USERNAME` a `SMTP_PASSWORD`, simulovaná schránka se vypne sama a Google se začne propojovat s existujícími účty se stejnou ověřenou adresou. Variable `SIMULATED_INBOX` k tomu není potřeba. `SIMULATED_INBOX=false` jen vypne simulaci tam, kde SMTP nastavené není (e-maily se pak jen logují).

## Na co dát pozor

- **Účty ověřené simulací** nemají doložené vlastnictví adresy: ověřovací odkaz viděl ten, kdo se registroval, ne majitel adresy. Se skutečnou poštou BetterAuth propojí Google s existujícím účtem se stejnou ověřenou adresou, takže by šlo převzít cizí účet. **Před krokem B** proto tým s PO rozhodne mezi třemi možnostmi:
  - **nechat účty ověřené** – nic se nedělá. Riziko se týká jen účtů založených s adresou, která registrujícímu nepatří; demo účty ze seedu jsou na `@example.com`, ty ohrožené nejsou,
  - **nechat je znovu ověřit**,
  - **vynulovat databázi stagingu**.
- Hodnoty jsou zapečené v image. Kdo image stáhne, přečte je: používejte jen klíče pro staging. Nikdy je nedávejte do repa, chatu ani issue.
