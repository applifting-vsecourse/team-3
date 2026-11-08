# Google přihlášení a skutečné e-maily na stagingu (#165)

Podle návodu cvičících: klíče jdou z **GitHub secrets → build-args v `deploy.yml` → `ENV` v `apps/backend/Dockerfile.deploy` → běžící backend**. Do Coolify se nic nezadává. Bez nastavených hodnot se nic nemění: Google tlačítko se neukáže a e-maily jdou do simulované schránky.

## 1. Google OAuth klient

Postup v [přihlášení přes Google](prihlaseni-pres-google.md), §1. U klienta musí být:

- Authorized JavaScript origins: `https://team-3.vsepractical.applifting.dev`
- Authorized redirect URIs: `https://team-3.vsepractical.applifting.dev/api/auth/callback/google`

Consent screen v režimu Testing pustí jen e-maily z Test users.

## 2. Gmail pro odesílání

Týmový Gmail se zapnutým dvoufázovým ověřením → Účet Google → Zabezpečení → **Hesla aplikací** → vytvořit heslo (16 znaků).

## 3. GitHub → Settings → Secrets and variables → Actions

**Secrets** (tajné):

| Název                  | Hodnota                  |
| ---------------------- | ------------------------ |
| `GOOGLE_CLIENT_ID`     | Client ID z Google       |
| `GOOGLE_CLIENT_SECRET` | Client secret z Google   |
| `SMTP_USERNAME`        | adresa týmového Gmailu   |
| `SMTP_PASSWORD`        | heslo aplikace z kroku 2 |

**Variables** (netajné):

| Název             | Hodnota                                                   |
| ----------------- | --------------------------------------------------------- |
| `SMTP_HOST`       | `smtp.gmail.com`                                          |
| `EMAIL_FROM`      | volitelné, např. `HobbyHub <adresa týmového Gmailu>`      |
| `SIMULATED_INBOX` | `false`, až budou e-maily chodit (jinak zůstane simulace) |

`SMTP_PORT` (465) a `SMTP_SECURE` (true) mají výchozí hodnoty, není potřeba je zadávat. Překlep v názvu Actions nenahlásí, jen pošle prázdnou hodnotu.

## 4. Nasazení a ověření

1. **Actions → Build & Deploy → Run workflow** (změna secretu se projeví až po novém buildu, 3–5 minut).
2. `https://team-3.vsepractical.applifting.dev/api/sign-in-providers` vrací `{"google":true}` a na `/login` je tlačítko Google.
3. Registrace s vlastním e-mailem: ověřovací e-mail přijde do schránky. Logy backendu jsou v Dozzle (`https://logs.vsepractical.applifting.dev`).

## Na co dát pozor

- **Účty ověřené simulací** nemají doložené vlastnictví adresy. Se skutečnou poštou BetterAuth propojí Google s existujícím účtem se stejnou ověřenou adresou. Před vypnutím simulace proto tým s PO rozhodne, jestli staging účty vynulovat, nebo je nechat znovu ověřit.
- Hodnoty jsou zapečené v image. Kdo image stáhne, přečte je: používejte jen klíče pro staging. Nikdy je nedávejte do repa, chatu ani issue.
