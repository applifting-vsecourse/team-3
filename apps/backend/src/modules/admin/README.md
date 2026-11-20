# Administrace (#308)

První nástřel superadmina: část B-063 bez fronty nahlášení (B-062). Superadmin je uživatel s `role = admin` (zakládá ho seed, viz README v kořeni repa).

- `AdminGuard` (`shared/auth/guards/admin.guard.ts`) chrání všechny `/api/admin/*`: bez session 401, kdokoli jiný než superadmin (i zablokovaný superadmin) 403 `NOT_ADMIN`; jako `VerifiedUserGuard` (#107) 403 `AGE_CONFIRMATION_REQUIRED`, dokud nepotvrdí věk. Roli i věk čte z databáze, ne ze session.
- `POST /api/admin/events/:id/hide` `{ reason }`: deaktivace akce (`status = hidden`). Jen zveřejněná akce, i proběhlá; zrušená ne (409 `EVENT_CANCELLED`), deaktivovaná podruhé ne (409 `EVENT_ALREADY_HIDDEN`). Důvod je povinný: server ho ořízne a samé mezery odmítne (400 `Napiš důvod deaktivace.`, ve službě kód `REASON_REQUIRED`), max. 500 znaků se počítá po oříznutí (`REASON_TOO_LONG`), do historie (`ModerationAction` typu `hide_event`) jde oříznutý (review #380).
- `POST /api/admin/events/:id/unhide`: obnovení, akce je zase `published` a u jejího `hide_event` se vyplní `revertedAt` a `revertedById`. Jen deaktivovaná akce (jinak 409 `EVENT_NOT_HIDDEN`).

Deaktivace skupiny (B-051) zruší i její nadcházející deaktivované akce, stejně jako zveřejněné a se stejným důvodem; zrušenou akci obnovit nejde (409 `EVENT_NOT_HIDDEN`), takže obnovení nikdy nezveřejní akci neaktivní skupiny (review #380).

Obojí běží pod zámkem řádku akce (jako přihlášení nebo úprava), odpovídá 204 a nikomu nic neposílá. Deaktivace není zrušení: zrušení (B-028) posílá e-mail účastníkům a vrátit nejde.

Deaktivovaná akce zmizí ze všech výpisů (`/akce`, mapa, úvodní stránka, Moje akce, profil, skupina, průměry hodnocení): ty berou jen `published` (a Moje akce i `cancelled`). Detail a všechno nad ním je pro každého kromě superadmina 404, i pro organizátora. Superadmin v detailu dostane i důvod deaktivace (`hiddenReason`, poslední nevrácený `hide_event`).

Úprava akce superadminem nemá vlastní endpoint: superadmin smí `PATCH /api/events/:id` a obrázek akce jako organizátor, se stejnými pravidly (ne zrušenou, ne po začátku). Do historie se zatím zapisuje jen deaktivace (typ zásahu pro úpravu chybí, rozhodnutí k #308).
