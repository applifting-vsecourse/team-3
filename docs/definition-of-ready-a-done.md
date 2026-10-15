# Definition of Ready a Definition of Done

## Definition of Ready

Story, která splňuje všechny body, dostane label `ready` a může do Sprint Backlogu.

- [ ] Má roli, akci a cíl (Jako … chci … abych …).
- [ ] Akceptační kritéria jdou ověřit – žádné „přívětivé“ nebo „rychlé“.
- [ ] Je jasné, co je mimo rozsah.
- [ ] Má podklady: wireframe (odkaz na frame), design, data.
- [ ] Nestojí na neověřeném předpokladu (žádný otevřený `[PŘEDPOKLAD TÝMU]` ani otázka na PO).
- [ ] Odsouhlasil ji PO.

**Test:** Dali byste ji agentovi a odešli na oběd? Pokud se po návratu bojíte, co najdete, story připravená není.

## Definition of Done

Story jde do sloupce **Done**, když:

- [ ] Kód je v `main` přes pull request, CI prošla.
- [ ] PR prošel code review nezávislým agentem; chyby „na první pohled“ a odchylky od akceptačních kritérií jsou opravené.
- [ ] Změna je nasazená na stagingu (https://team-3.vsepractical.applifting.dev).
- [ ] QA na stagingu ověřilo všechna akceptační kritéria a odškrtlo je v issue.
- [ ] Před sprint review tým projde celý happy path na stagingu dvěma účty.

**Accepted by PO:** PO si story na stagingu projde, akceptuje ji a zavře issue.

## Stavy na boardu

| Stav                  | Kdy tam karta je                         | Kdo ji tam posune |
| --------------------- | ---------------------------------------- | ----------------- |
| Product Backlog       | Odsouhlasená story, ještě nenaplánovaná  | PO                |
| Sprint Backlog        | Vybraná na sprint planningu, splňuje DoR | Tým               |
| In Progress           | Někdo na ní pracuje (s agentem)          | Vývojář           |
| Ready for Code Review | Otevřený pull request                    | Vývojář           |
| Ready for Testing     | PR mergnutý, nasazeno na dev             | Reviewer          |
| Done                  | QA ověřilo akceptační kritéria           | QA                |
| Accepted by PO        | PO akceptoval a zavřel issue             | PO                |
