# JLPT Reviewer

An N4 → N3 review course that runs in the browser: https://mendozaivanka.github.io/jlpt-reviewer/

It follows the method of the Nihongo Sou Matome series, with none of its content. Words, kanji and example sentences come from open dictionary data. Grammar lessons are written for this course.

## The course

| Weeks | What happens |
|---|---|
| 1–2 | N4 placement: sort N4 words and kanji, check N4 grammar. Twelve N4 grammar refresh lessons. |
| 3–20 | Six themes of three weeks each: home life, going out, days off, study and work, expressing yourself, learning together. Each lesson rechecks N4 words on its topic, teaches about 14 N3 words, introduces the kanji they use, and ends with an 8-item practice. |
| 3–12 | Three look-alike grammar patterns per lesson. |
| Every week | Day 7 is a timed test in JLPT question formats. |
| 17–24 | Consolidation and full mocks on paper with the official 公式問題集. |

Cards are scheduled with FSRS (ts-fsrs). New cards are capped per day; lesson cards come before the placement backlog. Progress is stored in the browser's IndexedDB. Export it from the Progress page.

## Commands

```bash
npm install
npm run data      # download sources into .cache/ and build public/data/
npm run dev       # http://localhost:4321/jlpt-reviewer/
npm run build     # type-check and build into dist/
npm run deploy    # rebuild data and site, publish dist/ to the gh-pages branch
```

`npm run data:refresh` re-downloads the sources.

## Content

- `scripts/build-data.mjs` joins the JLPT word lists to JMdict, picks example sentences (at most one kanji above N3), groups N3 words into lessons and assigns kanji to the lesson whose words first use them. N3 words beyond 14 per lesson go to an optional pool.
- `scripts/topics.mjs` groups words by topic from keywords in their English meanings. Move a word by hand with `content/topic-overrides.json`: `{ "締め切り": "Plans and time" }`.
- `content/grammar/*.json` holds the grammar lessons: three patterns each, with form, meaning, a plain paraphrase, two examples and one test item. The build fails if a lesson breaks the format.

Written so far: 12 N4 refresh lessons and the first 6 N3 lessons (course week 3). The other 54 N3 grammar lessons are added one course week ahead of study.

## Design

Nordic Rose, vendored from `mendozaivanka/nordic-rose`. Don't edit synced files here. Update with `npm run design:sync`.

## Sources and licenses

- JMdict and KANJIDIC, © EDRDG, CC BY-SA 4.0, via jmdict-simplified and kanji-data (MIT).
- Tatoeba example sentences, CC BY 2.0 FR.
- JLPT word lists by Jonathan Waller, CC BY, via open-anki-jlpt-decks (MIT).

Code is MIT. Generated data and grammar content are CC BY-SA 4.0. See LICENSE.
