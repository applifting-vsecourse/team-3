// #153: the password strength estimator with its dictionaries (~0.55 MB
// gzipped). Import it only through loadPasswordChecker(), which loads it on
// demand: a static import would put the dictionaries into the sign-up page.
import { ZxcvbnFactory, type TranslationKeys } from "@zxcvbn-ts/core"
import { adjacencyGraphs, dictionary as commonDictionary } from "@zxcvbn-ts/language-common"
import { translations as czech, dictionary as czechDictionary } from "@zxcvbn-ts/language-cs"

import type { PasswordCheck } from "@/features/auth/lib/password"

// The library's own Czech says „vy“ and one sentence is broken, so the
// feedback is ours, in the app's „ty“.
const warnings: TranslationKeys["warnings"] = {
  straightRow: "Řada kláves vedle sebe se dá snadno uhodnout.",
  keyPattern: "Krátký obrazec na klávesnici se dá snadno uhodnout.",
  simpleRepeat: "Opakované znaky jako „aaa“ se dají snadno uhodnout.",
  extendedRepeat: "Opakované skupiny jako „abcabc“ se dají snadno uhodnout.",
  sequences: "Řady jako „abc“ nebo „123“ se dají snadno uhodnout.",
  recentYears: "Nedávné roky se dají snadno uhodnout.",
  dates: "Data se dají snadno uhodnout.",
  topTen: "Tohle je jedno z nejpoužívanějších hesel vůbec.",
  topHundred: "Tohle je jedno z nejčastějších hesel.",
  common: "Tohle je běžné heslo.",
  similarToCommon: "Tohle se podobá běžnému heslu.",
  wordByItself: "Jedno slovo se dá snadno uhodnout.",
  namesByThemselves: "Samotné jméno nebo příjmení se dá snadno uhodnout.",
  commonNames: "Běžná jména a příjmení se dají snadno uhodnout.",
  userInputs: "Heslo by nemělo obsahovat tvé jméno, e-mail ani název HobbyHubu.",
  pwned: "Tohle heslo se objevilo mezi uniklými hesly.",
}

const suggestions: TranslationKeys["suggestions"] = {
  l33t: "Záměny jako „@“ za „a“ útočníci znají.",
  reverseWords: "Slova pozpátku útočníci znají.",
  allUppercase: "Velká písmena dej jen někam, ne všude.",
  capitalization: "Velké první písmeno moc nepomůže.",
  dates: "Vynech data a roky, které s tebou souvisí.",
  recentYears: "Vynech nedávné roky.",
  associatedYears: "Vynech roky, které s tebou souvisí.",
  sequences: "Vynech řady jako „abc“ nebo „123“.",
  repeated: "Vynech opakovaná slova a znaky.",
  longerKeyboardPattern: "Vynech obrazce z klávesnice.",
  anotherWord: "Přidej další, méně běžné slovo.",
  useWords: "Použij víc slov, ne známé rčení.",
  noNeed: "Speciální znaky nejsou potřeba, víc pomůže další slovo.",
  pwned: "Jestli ho používáš jinde, změň ho i tam.",
}

// Built once, when this module loads (~0.2 s): the dictionaries are indexed here.
const zxcvbn = new ZxcvbnFactory({
  dictionary: { ...commonDictionary, ...czechDictionary },
  graphs: adjacencyGraphs,
  translations: { ...czech, warnings, suggestions },
})

/**
 * How many guesses the password would take (zxcvbn's score 0–4), knowing the
 * common and Czech dictionaries, names, keyboard rows, dates, repeats, l33t
 * and the user's own words (`userInputs`), with feedback when it is weak.
 */
export function checkPassword(password: string, userInputs: string[]): PasswordCheck {
  const { score, feedback } = zxcvbn.check(password, userInputs)
  return { score, warning: feedback.warning, suggestions: feedback.suggestions }
}
