---
title: Loaded Words
publish: true
draft: false
tags: [projects, language, tools]
stage: finished
---

**Loaded Words** is a small, framework-free dictionary of polysemy: words that mean different things in different rooms. A *field* can be a pasture, a region of force, a database column, a battlefield, or an algebraic structure. A *cover* can protect a soldier, top a set in topology, hide a song, or add a charge to a dinner bill. The project makes those double lives visible.

[Open Loaded Words](/static/loaded-words/)

## What it does

The page has three views.

**Your text** takes a pasted paragraph and highlights the loaded words in it. The highlighted words have at least two visible senses. Below the text, the words are ranked by how often they appear, with their contexts attached. Matching is deliberately conservative: exact words, simple plurals, common verb forms, and phrases such as “black hole” are recognized. It is not trying to lemmatize everything or guess at spelling.

**Dictionary** lets you browse roughly 1,900 words and 3,600 senses. You can search, filter by context, sort by commonness or number of contexts, and turn off the “2+ contexts” filter to see the full set. Search is exact first; fuzzy matching appears only as a lookup suggestion, not as a text matcher.

**Overlaps** shows where the meanings pile up: context totals, the most-loaded words, and bars for common combinations such as general + math or general + science. There is no giant word-by-context grid. The useful question is not “show me every cell” but “which words travel between rooms, and which rooms share the most vocabulary?”

## The eight contexts

The current edition uses **general**, **risqué**, **math**, **science**, **computing**, **military**, **food**, and **music**.

Science is deliberately broad. It rolls biology, medicine, chemistry, physics, geology, and astronomy into one context, with optional subfields on individual senses. Splitting them would have produced a prettier matrix and a worse browsing experience: most readers want to know that a word has a scientific sense, not which subfield owns it.

Risqué senses are hidden by default. A switch in the header reveals them. When they are hidden, risqué-only words disappear, and words with both risqué and non-risqué senses show only the non-risqué side.

## How the data was made

The base glosses come from [Open English WordNet 2024](https://en-word.net/), which is licensed CC BY 4.0. WordNet is excellent at giving a word a range of established senses, and less good at slang, recent usage, and the particular senses that make a word interesting across domains. So the project adds two editorial layers:

- curated context lists, which decide which words belong in which rooms;
- hand-written glosses and corrections, marked `LW`, for slang, specialist senses, and cases where WordNet’s first sense is the wrong homonym.

The result is not a neutral corpus extract. It is an edited dictionary. Some entries are still imperfect, and the hand-written layer is where most of the useful judgment lives.

## Design notes

The page is plain HTML, CSS, and JavaScript. There is no framework, no build step for the site itself, and no server. The data is a single `window.LOADED_WORDS` array. That keeps the project easy to attach to a static site and easy to inspect.

The interface follows the data rather than the other way around. Hover cards on desktop and a bottom sheet on mobile show the senses without forcing a page change. Context colors are consistent across highlights, chips, cards, and overlap bars. The text highlighter only marks words with two or more visible contexts, so the page does not light up every noun in a paragraph.

## Caveats

This is a first edition, not a lexical authority. WordNet senses can be dated, oddly granular, or simply wrong for a given context. The hand-written layer fixes many common cases but not all of them. The context lists are editorial too: a word is included because it has a real sense in that domain, not because every speaker would recognize it immediately.

If a sense looks wrong, the useful fix is usually a specific gloss and a note about the context, not a broader rule. The project is designed to be corrected.

## Attribution

Glosses are from Open English WordNet 2024 (CC BY 4.0). Hand-written glosses are marked `LW`. The data and page are by Justin Slud and are available under CC BY 4.0.
