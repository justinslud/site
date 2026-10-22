# Loaded Words

A small, framework-free dictionary of words that mean different things in different rooms.

Live app: <https://justinslud.com/static/loaded-words/>

## Sources

- **Open English WordNet 2024 (OEWN)** — base definitions and examples. Licensed CC BY 4.0. <https://en-word.net/>
- **wordfreq** — Zipf frequency scores used for the `FREQ` figure and rarity labels.
- **Curated context lists and hand-written glosses** — editorial selection of words and senses for math, science, computing, military, food, music, and risqué usage. Hand-written glosses are marked `LW` in the data.
- Context and note copy was written for this project.

The deployed data is CC BY 4.0. OEWN attribution is required for the WordNet-derived glosses.

## Current data

- 2,127 words
- 4,073 senses
- 1,684 words with two or more contexts before risqué filtering
- 745 hand-written `LW` senses
- 3,328 OEWN senses

## Files

- `index.html` — page structure
- `styles.css` — layout and responsive styles
- `app.js` — matching, highlighting, dictionary, overlaps, cards
- `contexts.js` — context labels and colors
- `samples.js` — example paragraphs
- `words.js` — generated dataset; do not edit by hand

## Rebuilding

The working source uses `tools/build_data.py`, Python 3, `wn` (with OEWN 2024 installed), and `wordfreq`.

```bash
python tools/build_data.py
```

This rewrites `words.js`. Copy the app files into `quartz/static/loaded-words/` in the site repo after rebuilding.

## Matching notes

Text matching uses exact words, simple stem forms, common irregular forms, and known phrases. Fuzzy suggestions are used only in dictionary search, not in pasted-text matching. Risqué senses are hidden unless the toggle is turned on.
