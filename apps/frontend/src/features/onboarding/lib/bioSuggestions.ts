import { inSentence } from "@/lib/inSentence"

export const BIO_MAX_LENGTH = 500

export type BioSuggestionContext = {
  displayName?: string | null
  localityName?: string | null
  activityNames: readonly string[]
}

export type BioSuggestionTone = "natural" | "social" | "playful" | "short" | "curious"

export type BioSuggestion = {
  id: string
  tone: BioSuggestionTone
  text: string
}

type TemplateContext = {
  greeting: string
  name: string
  interests: string
  locality: string
}

type Template = [id: string, tone: BioSuggestionTone, render: (context: TemplateContext) => string]

const formatList = new Intl.ListFormat("cs", { type: "conjunction" })

const templates: readonly Template[] = [
  [
    "straightforward",
    "natural",
    ({ greeting, interests }) =>
      `${greeting} ${interests ? `Ve volném čase mě baví ${interests}.` : "Ve volném čase mě baví zkoušet něco nového."} Paráda, když se k tomu sejde dobrá parta.`,
  ],
  [
    "find-a-group",
    "social",
    ({ name, interests }) =>
      `${name ? `Jsem ${name}${periodAfter(name)} ` : ""}Hledám lidi, se kterými se občas potkat a něco podniknout.${interests ? ` Co třeba ${interests}?` : " Čím začneme?"}`,
  ],
  [
    "less-chat-more-meet",
    "playful",
    ({ interests }) =>
      `${interests ? `Jako záminka na sraz dobře zní ${interests}.` : "Rozhlížím se po nových koníčcích."} Nejlepší skupinový chat je ten, ze kterého nakonec vznikne sraz.`,
  ],
  [
    "see-you",
    "short",
    ({ name }) =>
      name
        ? `Tady ${name}${periodAfter(name)} Na které akci se potkáme?`
        : "Na které akci se potkáme?",
  ],
  [
    "give-it-a-go",
    "curious",
    ({ interests, locality }) =>
      `${interests ? `Zajímá mě ${interests}.` : "Chci zjistit, co mě bude bavit."} Ještě radši se nechám překvapit tím, co se dá podniknout ${locality ? `v okolí (${locality})` : "kousek odtud"}.`,
  ],
  [
    "calendar",
    "natural",
    ({ interests }) =>
      `${interests ? `Do volného času se mi dobře vejde ${interests}.` : "Do kalendáře si chci přidat víc společných akcí."} Hledám příležitost dostat se k tomu častěji.`,
  ],
  [
    "first-meet",
    "social",
    ({ greeting }) =>
      `${greeting} Baví mě, když se lidé dají do řeči při něčem společném. Jestli na akci nikoho neznáš, klidně se přidej ke mně.`,
  ],
  [
    "bring-ideas",
    "playful",
    () =>
      "Ideální začátek akce? Někdo napíše „Kdo jde?“ a ostatní odpoví dřív, než se musí zakládat anketa.",
  ],
  [
    "shared-time",
    "short",
    ({ interests }) =>
      interests
        ? `Baví mě ${interests}. Ve dvou nebo v partě ještě víc.`
        : "Volno je lepší v dobré partě.",
  ],
  [
    "someone-show-me",
    "curious",
    ({ interests }) =>
      `${interests ? `Zatím mě sem přivádí ${interests}.` : "Zatím se rozhlížím."} Jestli máš oblíbenou akci, na kterou se vyplatí zajít poprvé, sem s ní.`,
  ],
  [
    "near-home",
    "natural",
    ({ interests, locality }) =>
      `${interests ? `Láká mě ${interests}.` : "Lákají mě společné aktivity."} Nejprve se dívám, co se dá podniknout v okolí${locality ? ` (${locality})` : ""}.`,
  ],
  [
    "first-move",
    "social",
    () =>
      "Na první setkání mi stačí jednoduchý plán. Domluvíme se, sejdeme se a příště třeba vymyslíme něco většího.",
  ],
  [
    "send-invitation",
    "playful",
    ({ interests }) =>
      `Jestli máš chuť někam vyrazit, pošli pozvánku.${interests ? ` Pro začátek mě láká ${interests}.` : " Vymyslíme něco i bez tří týdnů domlouvání."}`,
  ],
  ["fresh-start", "short", ({ greeting }) => `${greeting} Těším se na první společnou akci.`],
  [
    "outside-list",
    "curious",
    ({ interests }) =>
      `${interests ? `Ve výběru mě nejvíc zajímá ${interests}.` : "Chci si udělat obrázek, co se tu dá podniknout."} Klidně mě ale přizvi i k něčemu úplně jinému.`,
  ],
  [
    "regular",
    "natural",
    ({ interests }) =>
      `${interests ? `Mezi moje zájmy patří ${interests}.` : "Chci mít víc důvodů naplánovat si volno."} Bylo by fajn najít akci, na kterou se dá vracet.`,
  ],
  [
    "casual",
    "social",
    ({ locality }) =>
      `Hledám partu, ve které se člověk může přidat i bez velkého představování. Ideálně se potkáme na akci v okolí${locality ? ` (${locality})` : ""}.`,
  ],
  [
    "weekend",
    "playful",
    () =>
      "Je fajn mít volné odpoledne. Ještě lepší je mít k němu plán a někoho, kdo na zprávu „Tak v kolik?“ opravdu odpoví.",
  ],
  [
    "open-to-ideas",
    "short",
    ({ interests }) =>
      interests
        ? `Láká mě ${interests}. Dalším nápadům se nebráním.`
        : "Nové akce a nové tváře? Sem s nimi.",
  ],
  [
    "try-something-unusual",
    "curious",
    () =>
      "Na HobbyHubu chci objevit něco, co by mě bez doporučení nenapadlo zkusit. Nejlepší tipy mívají lidi, kteří se pro něco už nadchli.",
  ],
  [
    "about-my-picks",
    "natural",
    ({ greeting, interests }) =>
      `${greeting} ${interests ? `Nejvíc mě teď láká ${interests}.` : "Prohlížím si, co všechno se dá podniknout."} Na HobbyHubu hledám příležitost u toho poznat pár lidí.`,
  ],
  [
    "partner",
    "social",
    ({ interests }) =>
      `${interests ? `Baví mě ${interests}.` : "Baví mě mít s kým vyrazit."} Pokud taky hledáš někoho na občasnou společnou akci, můžeme začít jedním srazem.`,
  ],
  [
    "no-ice-breaker",
    "playful",
    () =>
      "Představování můžeme zkrátit. Stačí se prostě potkat na akci a během ní určitě najdeme téma.",
  ],
  ["one-good-plan", "short", () => "Hledám jeden dobrý plán na volno. Zbytek se ukáže na místě."],
  [
    "curiosity-nearby",
    "curious",
    ({ locality }) =>
      `Zajímá mě, co se děje za rohem${locality ? ` (${locality})` : ""}. Třeba mi příští oblíbený koníček leží přímo pod nosem.`,
  ],
  [
    "first-person",
    "natural",
    ({ name, interests }) =>
      `${name ? `Představím se krátce. Jsem ${name}${periodAfter(name)} ` : ""}${interests ? `Ve volném čase mě zajímá ${interests}.` : "Volný čas chci trávit pestřeji."} Chci se potkávat častěji i mimo obrazovku.`,
  ],
  [
    "room-in-group",
    "social",
    ({ interests }) =>
      `${interests ? `Vybírám si akce, kde je na programu ${interests}.` : "Rozhlížím se po společných akcích."} Jestli sháníš někoho do party, klidně se přidám.`,
  ],
  [
    "meeting-over-notification",
    "playful",
    ({ greeting }) =>
      `${greeting} Víc než další upozornění mě potěší jedna dobrá pozvánka. Něco, co skončí setkáním a ne jen palcem nahoru.`,
  ],
  [
    "one-message",
    "short",
    ({ interests }) =>
      interests
        ? `Na společný plán mě napadá ${interests}.`
        : "Jestli hledáš někoho na akci, klidně napiš.",
  ],
  [
    "simple-question",
    "curious",
    () =>
      "Jaká akce tě příjemně překvapila? Láká mě zkusit právě ty, jejichž návštěvu by člověk sám od sebe nenaplánoval.",
  ],
  [
    "every-now-and-then",
    "natural",
    ({ interests }) =>
      `Chci si častěji udělat čas na to, co mě baví.${interests ? ` Láká mě třeba ${interests}.` : ""} Společná akce je dobrý důvod něco si opravdu naplánovat.`,
  ],
  [
    "friendly-invitation",
    "social",
    ({ name }) =>
      `${name ? `Ahoj, tady ${name}${periodAfter(name)} ` : "Ahoj. "}Jestli se chystáš na nějakou akci a nechceš tam přijít bez známého člověka, můžeme se domluvit předem.`,
  ],
  [
    "something-better",
    "playful",
    ({ interests }) =>
      `Volno se dá strávit nekonečným projížděním příspěvků. Zní mi líp ${interests || "akce v dobré partě"}.`,
  ],
  ["try-it-together", "short", () => "Hledám lidi na společné akce a nové věci k vyzkoušení."],
  [
    "not-just-one-hobby",
    "curious",
    ({ interests }) =>
      `${interests ? `První volba je pro mě ${interests}.` : "Nemám tu zatím jeden jasný koníček."} Chci si ale nechat prostor i na to, co se do prvního výběru nevešlo.`,
  ],
  [
    "local-plans",
    "natural",
    ({ locality }) =>
      `Hledám nenucené akce v okolí${locality ? ` (${locality})` : ""}. Takové, na které se dá přidat i jen proto, že má člověk volno a chuť mezi lidi.`,
  ],
  [
    "know-a-person",
    "social",
    ({ interests }) =>
      `${interests ? `Chci poznat lidi, které baví ${interests}.` : "Chci poznat pár lidí se společnými zájmy."} Nejlépe tak, že se rovnou na něčem potkáme.`,
  ],
  [
    "whose-turn",
    "playful",
    () =>
      "Můj oblíbený druh domlouvání je „Tak jo, platí.“ Pak už jen zbývá zjistit, do čeho jsme se to pustili.",
  ],
  [
    "back-to-basics",
    "short",
    ({ name, interests }) =>
      [
        name && `Jsem ${name}${periodAfter(name)}`,
        interests ? `Baví mě ${interests}.` : "Lákají mě společné akce.",
      ]
        .filter(Boolean)
        .join(" "),
  ],
  [
    "give-a-tip",
    "curious",
    ({ locality }) =>
      `Máš tip na místo, kde se v okolí${locality ? ` (${locality})` : ""} schází dobrá parta? Chci místní akce poznat i jinak než z kalendáře.`,
  ],
  [
    "simple-hello",
    "natural",
    ({ greeting, interests }) =>
      `${greeting} Nejlíp trávím volno u něčeho, do čeho se dá opravdu zapojit.${interests ? ` Teď mě nejvíc zajímá ${interests}.` : " Proto se rozhlížím po akcích, kde se dá přidat."}`,
  ],
  [
    "open-seat",
    "social",
    () =>
      "Jestli je v partě volné místo, dej vědět. Klidně se přidám napoprvé a uvidíme, jestli se z toho stane zvyk.",
  ],
  [
    "from-maybe-to-meet",
    "playful",
    ({ interests }) =>
      `${interests ? `Dobrá záminka k setkání je pro mě ${interests}.` : "Dobrá záminka k setkání se vždycky najde."} Z „někdy bychom mohli“ se tu třeba stane „vidíme se ve čtvrtek“.`,
  ],
  [
    "good-company",
    "short",
    ({ locality }) =>
      `Dobrá parta a něco, co se dá podniknout v okolí${locality ? ` (${locality})` : ""}.`,
  ],
  [
    "curious-beginner",
    "curious",
    ({ interests }) =>
      `${interests ? `Láká mě ${interests}. Klidně dám šanci i dalším věcem.` : "Klidně dám šanci i věcem, které jsou pro mě nové."} Na nových akcích mě baví zjistit, co na nich ostatní tak chytlo.`,
  ],
  [
    "look-forward",
    "natural",
    ({ interests }) =>
      `${interests ? `Ve volnu mě láká ${interests}.` : "Chci si do volného času přidat něco, na co se dá těšit."} Ideálně v partě, se kterou se dá domluvit i příště.`,
  ],
  [
    "small-group",
    "social",
    ({ name, interests }) =>
      `${name ? `Jsem ${name}${periodAfter(name)} ` : ""}Ke společné akci mi stačí pár lidí a nápad.${interests ? ` Jako první mě napadá ${interests}.` : " Jestli máš jedno nebo druhé, ozvi se."}`,
  ],
  [
    "almost-a-plan",
    "playful",
    ({ interests }) =>
      `${interests ? `Základ plánu už mám. Zajímá mě ${interests}.` : "Na volný čas mám chuť něco podniknout."} Teď ještě najít parťáky a den, kdy se nám to všem vejde.`,
  ],
  [
    "meet-locally",
    "short",
    ({ locality }) =>
      `Hledám společné akce v okolí${locality ? ` (${locality})` : ""}. Třeba se potkáme.`,
  ],
  [
    "show-your-favourite",
    "curious",
    () =>
      "Baví mě vidět, pro co se ostatní nadchnou. Jestli chceš někoho vzít na svoji oblíbenou akci, klidně napiš.",
  ],
  [
    "more-offline",
    "natural",
    ({ greeting }) =>
      `${greeting} Na HobbyHubu hledám důvody potkávat se i mimo internet. Začnu jednou akcí a uvidím, kam mě zavede.`,
  ],
  [
    "shared-interests-or-something-new",
    "social",
    ({ interests }) =>
      `${interests ? `Jestli tě taky baví ${interests}, máme o čem mluvit.` : "Společný koníček je dobrá záminka dát se do řeči."} A jestli nás baví různé věci, klidně si vyměníme tipy.`,
  ],
  [
    "calendar-experiment",
    "playful",
    () =>
      "Zkouším nový trik do kalendáře. Ke všemu, co musím, chci pravidelně přidat i něco, na co se fakt těším.",
  ],
  [
    "keep-it-simple",
    "short",
    ({ greeting, interests }) =>
      `${greeting} ${interests ? `Láká mě ${interests}.` : "Láká mě poznat nové lidi."}`,
  ],
  [
    "where-to-start",
    "curious",
    ({ interests }) =>
      `${interests ? `Hned na začátku mě tu láká ${interests}.` : "Pořád si dělám představu, kde začít."} Jestli znáš akci, na kterou můžu i bez příprav, sem s ní.`,
  ],
  [
    "unhurried",
    "natural",
    () =>
      "Chci si najít nové věci, na které se dá ve volnu těšit. Nemusí z nich být hned velký projekt. Stačí mít důvod vyrazit mezi lidi.",
  ],
  [
    "together-instead-of-alone",
    "social",
    ({ interests }) =>
      `${interests ? `Na společný čas mi přijde fajn ${interests}.` : "Na společný čas mi přijde fajn jakákoli akce, u které se dá poznat pár lidí."} Pokud tě něco napadá, klidně se ozvi.`,
  ],
  [
    "less-planning",
    "playful",
    () =>
      "Tři kroky k dobrému odpoledni. Najít akci. Domluvit čas. A pak udělat to, co se do chatu nevejde. Sejít se.",
  ],
  [
    "my-three",
    "short",
    ({ interests }) =>
      interests
        ? `Zajímá mě ${interests}. Jestli chceš podniknout něco podobného, napiš.`
        : "Co podnikneme? Mám chuť na něco ve společnosti.",
  ],
  [
    "leave-room-for-surprise",
    "curious",
    ({ greeting, locality }) =>
      `${greeting} Chci se porozhlédnout po akcích v okolí${locality ? ` (${locality})` : ""} a zjistit, co mi v kalendáři dosud chybělo.`,
  ],
]

const periodAfter = (name: string) => (/[.!?]$/.test(name) ? "" : ".")

function cleanLabel(value: string | null | undefined, limit: number): string {
  const clean =
    value
      ?.normalize("NFC")
      .replace(/\p{Cc}|\s/gu, " ")
      .replace(/ +/g, " ")
      .trim() ?? ""
  return clean.length <= limit ? clean : ""
}

function activityList(activityNames: readonly string[]): string {
  const activities = new Set<string>()
  for (const name of activityNames) {
    const label = inSentence(cleanLabel(name, 72))
    if (label) activities.add(label)
    if (activities.size === 3) break
  }
  return joinActivities([...activities])
}

const hasConjunction = (label: string) => /\sa\s/u.test(label)

/**
 * „volejbal, florbal a běh“. A name that has its own „a“ (Fotbal a malá kopaná,
 * Lezení a bouldering) would make the usual list unreadable („volejbal, florbal a
 * fotbal a malá kopaná“, review #384), so such a list ends with „i“ instead:
 * „volejbal, florbal i fotbal a malá kopaná“.
 */
function joinActivities(labels: readonly string[]): string {
  if (labels.length < 2 || !labels.some(hasConjunction)) return formatList.format(labels)
  return `${labels.slice(0, -1).join(", ")} i ${labels.at(-1)}`
}

export function createBioSuggestions({
  displayName,
  localityName,
  activityNames,
}: BioSuggestionContext): readonly BioSuggestion[] {
  const name = cleanLabel(displayName, 80)
  const context: TemplateContext = {
    greeting: name ? `Ahoj, jsem ${name}${periodAfter(name)}` : "Ahoj.",
    name,
    interests: activityList(activityNames),
    locality: cleanLabel(localityName, 80),
  }
  return templates.map(([id, tone, render]) => {
    const text = render(context)
    // Keep a whole draft if an upstream catalog ever exceeds the editor's length limit.
    return {
      id,
      tone,
      text:
        text.length <= BIO_MAX_LENGTH ? text : render({ ...context, interests: "", locality: "" }),
    }
  })
}

export function nextBioSuggestionIndex(
  currentIndex: number,
  direction: -1 | 1,
  count: number,
): number {
  if (!Number.isSafeInteger(count) || count <= 0) return 0
  const index = Number.isSafeInteger(currentIndex) ? currentIndex % count : 0
  const next = (index + direction) % count
  if (next === 0) return 0
  return next < 0 ? next + count : next
}
