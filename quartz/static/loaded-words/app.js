(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const CONTEXTS = Array.isArray(window.LOADED_CONTEXTS) ? window.LOADED_CONTEXTS : [];
  const CTX = Object.fromEntries(CONTEXTS.map((c) => [c.id, c]));
  const CONTEXT_ORDER = CONTEXTS.map((c) => c.id);
  const RAW = Array.isArray(window.LOADED_WORDS) ? window.LOADED_WORDS : [];
  const SAMPLES = Array.isArray(window.LOADED_SAMPLES) ? window.LOADED_SAMPLES : [];

  const entries = RAW
    .filter((e) => e && typeof e.w === "string" && Array.isArray(e.senses))
    .map((e) => ({
      ...e,
      _contexts: new Set(e.senses.map((s) => s.c)),
    }));

  const byWord = new Map(entries.map((e) => [e.w, e]));
  const ALL_COUNT = entries.length;
  const LOADED_TOTAL = entries.filter((e) => e._contexts.size >= 2).length;
  const SENSE_TOTAL = entries.reduce((n, e) => n + e.senses.length, 0);
  const HOVER_QUERY = window.matchMedia ? window.matchMedia("(hover: hover)") : { matches: true };

  const state = {
    view: "text",
    showRisque: false,
    dictQuery: "",
    dictContexts: new Set(),
    overlapContexts: new Set(),
    comboFilter: [],
    sort: "contexts",
    loadedOnly: true,
    limit: 80,
    sample: 0,
    cardWord: null,
    pinned: false,
  };

  let formTrie = null;
  let textTimer = null;
  let cardHideTimer = null;

  const esc = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const norm = (value) =>
    String(value)
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const cssColor = (id) => (CTX[id] && CTX[id].color) || "#0f766e";
  const ctxLabel = (id) => (CTX[id] && CTX[id].label) || id;

  function dot(id) {
    return `<span class="dot" style="--dot:${cssColor(id)}"></span>`;
  }

  function visibleSenses(entry) {
    if (!entry) return [];
    return entry.senses.filter((s) => state.showRisque || s.c !== "risque");
  }

  function visibleContexts(entry) {
    return CONTEXT_ORDER.filter((id) => visibleSenses(entry).some((s) => s.c === id));
  }

  function isLoaded(entry) {
    return visibleContexts(entry).length >= 2;
  }

  function contextCounts() {
    const counts = Object.fromEntries(CONTEXT_ORDER.map((id) => [id, 0]));
    for (const entry of entries) {
      for (const id of new Set(visibleSenses(entry).map((s) => s.c))) {
        if (id in counts) counts[id] += 1;
      }
    }
    return counts;
  }

  function frequencyLabel(freq) {
    if (freq >= 5.5) return "very common";
    if (freq >= 4.5) return "common";
    if (freq >= 3.5) return "uncommon";
    return "rare";
  }

  function ctxChip(id, extra = "") {
    return `<span class="mini-chip" style="--dot:${cssColor(id)}">${dot(id)}${esc(ctxLabel(id))}${extra}</span>`;
  }

  /* ---------------------------------------------------------------------
     Forms and matching
     --------------------------------------------------------------------- */

  const IRREGULAR_FORMS = {
    person: ["people"],
    man: ["men"],
    woman: ["women"],
    child: ["children"],
    foot: ["feet"],
    tooth: ["teeth"],
    goose: ["geese"],
    mouse: ["mice"],
    louse: ["lice"],
    ox: ["oxen"],
    die: ["dice"],
    basis: ["bases"],
    analysis: ["analyses"],
    crisis: ["crises"],
    thesis: ["theses"],
    hypothesis: ["hypotheses"],
    datum: ["data"],
    medium: ["media"],
    criterion: ["criteria"],
    phenomenon: ["phenomena"],
    alumnus: ["alumni"],
    cactus: ["cacti"],
    focus: ["foci"],
    fungus: ["fungi"],
    nucleus: ["nuclei"],
    radius: ["radii"],
    stimulus: ["stimuli"],
    syllabus: ["syllabi"],
    index: ["indices", "indexes"],
    matrix: ["matrices"],
    vertex: ["vertices"],
    axis: ["axes"],
    appendix: ["appendices"],
    leaf: ["leaves"],
    life: ["lives"],
    knife: ["knives"],
    wife: ["wives"],
    half: ["halves"],
    wolf: ["wolves"],
    shelf: ["shelves"],
    calf: ["calves"],
    loaf: ["loaves"],
    thief: ["thieves"],
    scarf: ["scarves"],
    be: ["am", "is", "are", "was", "were", "been", "being"],
    have: ["has", "had", "having"],
    do: ["does", "did", "done", "doing"],
    go: ["goes", "went", "gone", "going"],
    say: ["says", "said", "saying"],
    get: ["gets", "got", "gotten", "getting"],
    make: ["makes", "made", "making"],
    know: ["knows", "knew", "known", "knowing"],
    think: ["thinks", "thought", "thinking"],
    take: ["takes", "took", "taken", "taking"],
    see: ["sees", "saw", "seen", "seeing"],
    come: ["comes", "came", "coming"],
    find: ["finds", "found", "finding"],
    give: ["gives", "gave", "given", "giving"],
    tell: ["tells", "told", "telling"],
    feel: ["feels", "felt", "feeling"],
    leave: ["leaves", "left", "leaving"],
    put: ["puts", "putting"],
    mean: ["means", "meant", "meaning"],
    keep: ["keeps", "kept", "keeping"],
    let: ["lets", "letting"],
    begin: ["begins", "began", "begun", "beginning"],
    hear: ["hears", "heard", "hearing"],
    run: ["runs", "ran", "running"],
    hold: ["holds", "held", "holding"],
    bring: ["brings", "brought", "bringing"],
    write: ["writes", "wrote", "written", "writing"],
    sit: ["sits", "sat", "sitting"],
    stand: ["stands", "stood", "standing"],
    lose: ["loses", "lost", "losing"],
    pay: ["pays", "paid", "paying"],
    meet: ["meets", "met", "meeting"],
    lead: ["leads", "led", "leading"],
    understand: ["understands", "understood", "understanding"],
    speak: ["speaks", "spoke", "spoken", "speaking"],
    read: ["reads", "reading"],
    spend: ["spends", "spent", "spending"],
    grow: ["grows", "grew", "grown", "growing"],
    win: ["wins", "won", "winning"],
    buy: ["buys", "bought", "buying"],
    send: ["sends", "sent", "sending"],
    build: ["builds", "built", "building"],
    fall: ["falls", "fell", "fallen", "falling"],
    cut: ["cuts", "cutting"],
    sell: ["sells", "sold", "selling"],
    teach: ["teaches", "taught", "teaching"],
    catch: ["catches", "caught", "catching"],
    throw: ["throws", "threw", "thrown", "throwing"],
    fight: ["fights", "fought", "fighting"],
    fly: ["flies", "flew", "flown", "flying"],
    draw: ["draws", "drew", "drawn", "drawing"],
    drive: ["drives", "drove", "driven", "driving"],
    eat: ["eats", "ate", "eaten", "eating"],
    drink: ["drinks", "drank", "drunk", "drinking"],
    sing: ["sings", "sang", "sung", "singing"],
    swim: ["swims", "swam", "swum", "swimming"],
    ring: ["rings", "rang", "rung", "ringing"],
    break: ["breaks", "broke", "broken", "breaking"],
    choose: ["chooses", "chose", "chosen", "choosing"],
    freeze: ["freezes", "froze", "frozen", "freezing"],
    hide: ["hides", "hid", "hidden", "hiding"],
    ride: ["rides", "rode", "ridden", "riding"],
    rise: ["rises", "rose", "risen", "rising"],
    shake: ["shakes", "shook", "shaken", "shaking"],
    shoot: ["shoots", "shot", "shooting"],
    sleep: ["sleeps", "slept", "sleeping"],
    wear: ["wears", "wore", "worn", "wearing"],
    tear: ["tears", "tore", "torn", "tearing"],
    wake: ["wakes", "woke", "woken", "waking"],
    bear: ["bears", "bore", "borne", "bearing"],
    beat: ["beats", "beating"],
    bite: ["bites", "bit", "bitten", "biting"],
    blow: ["blows", "blew", "blown", "blowing"],
    burn: ["burns", "burned", "burnt", "burning"],
    cast: ["casts", "casting"],
    deal: ["deals", "dealt", "dealing"],
    dig: ["digs", "dug", "digging"],
    feed: ["feeds", "fed", "feeding"],
    hang: ["hangs", "hung", "hanging"],
    hit: ["hits", "hitting"],
    hurt: ["hurts", "hurting"],
    lay: ["lays", "laid", "laying"],
    lend: ["lends", "lent", "lending"],
    light: ["lights", "lit", "lighting"],
    mistake: ["mistakes", "mistook", "mistaken", "mistaking"],
    prove: ["proves", "proved", "proven", "proving"],
    quit: ["quits", "quitting"],
    seek: ["seeks", "sought", "seeking"],
    shine: ["shines", "shone", "shining"],
    shut: ["shuts", "shutting"],
    sink: ["sinks", "sank", "sunk", "sinking"],
    slide: ["slides", "slid", "sliding"],
    smell: ["smells", "smelled", "smelt", "smelling"],
    speed: ["speeds", "sped", "speeding"],
    spell: ["spells", "spelled", "spelt", "spelling"],
    spill: ["spills", "spilled", "spilt", "spilling"],
    spin: ["spins", "spun", "spinning"],
    spit: ["spits", "spat", "spitting"],
    split: ["splits", "splitting"],
    spread: ["spreads", "spreading"],
    spring: ["springs", "sprang", "sprung", "springing"],
    steal: ["steals", "stole", "stolen", "stealing"],
    stick: ["sticks", "stuck", "sticking"],
    sting: ["stings", "stung", "stinging"],
    stink: ["stinks", "stank", "stunk", "stinking"],
    strike: ["strikes", "struck", "striking"],
    swear: ["swears", "swore", "sworn", "swearing"],
    sweep: ["sweeps", "swept", "sweeping"],
    swell: ["swells", "swelled", "swollen", "swelling"],
    swing: ["swings", "swung", "swinging"],
    weave: ["weaves", "wove", "woven", "weaving"],
    weep: ["weeps", "wept", "weeping"],
    wind: ["winds", "wound", "winding"],
    withdraw: ["withdraws", "withdrew", "withdrawn", "withdrawing"],
    wring: ["wrings", "wrung", "wringing"],
  };

  function addPlural(set, word) {
    if (!word) return;
    if (/(s|x|z|ch|sh)$/.test(word)) {
      set.add(word + "es");
    } else if (/[^aeiou]y$/.test(word)) {
      set.add(word.slice(0, -1) + "ies");
    } else if (/(f|fe)$/.test(word)) {
      set.add(word.replace(/fe?$/, "ves"));
      set.add(word + "s");
    } else {
      set.add(word + "s");
    }
  }

  function addVerbForms(set, word) {
    if (!word) return;
    if (word.endsWith("e")) {
      set.add(word + "d");
      set.add(word.slice(0, -1) + "ing");
      set.add(word + "s");
    } else if (/[^aeiou]y$/.test(word)) {
      set.add(word.slice(0, -1) + "ied");
      set.add(word.slice(0, -1) + "ying");
      set.add(word + "s");
    } else if (word.endsWith("c")) {
      set.add(word + "ked");
      set.add(word + "king");
      set.add(word + "s");
    } else {
      set.add(word + "ed");
      set.add(word + "ing");
      set.add(word + "s");
    }
    if (word.length <= 6) {
      set.add(word + "er");
      set.add(word + "est");
    }
  }

  function singleForms(word) {
    const set = new Set([word, norm(word)]);
    const irregular = IRREGULAR_FORMS[word];
    if (irregular) irregular.forEach((f) => set.add(f));
    else addPlural(set, word);
    addVerbForms(set, word);
    return set;
  }

  function formsFor(word) {
    if (!word.includes(" ")) return singleForms(word);
    const parts = word.split(" ");
    const last = parts.pop();
    const prefix = parts.join(" ");
    const forms = new Set([word]);
    for (const form of singleForms(last)) {
      forms.add(prefix + " " + form);
    }
    return forms;
  }

  function buildTrie() {
    const root = { next: new Map(), out: [] };
    for (const entry of entries) {
      for (const form of formsFor(entry.w)) {
        const tokens = form.split(/\s+/).filter(Boolean);
        if (!tokens.length) continue;
        let node = root;
        for (const token of tokens) {
          const key = norm(token);
          if (!key) continue;
          if (!node.next.has(key)) node.next.set(key, { next: new Map(), out: [] });
          node = node.next.get(key);
        }
        if (!node.out.includes(entry.w)) node.out.push(entry.w);
      }
    }
    return root;
  }

  const TOKEN_RE = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g;

  function tokenize(text) {
    const tokens = [];
    for (const match of text.matchAll(TOKEN_RE)) {
      tokens.push({
        raw: match[0],
        key: norm(match[0]),
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return tokens;
  }

  function matchText(text) {
    if (!formTrie || !text) return [];
    const tokens = tokenize(text);
    const hits = [];
    let i = 0;
    while (i < tokens.length) {
      let node = formTrie;
      let best = null;
      for (let j = i; j < tokens.length; j += 1) {
        if (j > i) {
          const gap = text.slice(tokens[j - 1].end, tokens[j].start);
          if (!/^[\s\-]+$/.test(gap)) break;
        }
        const next = node.next.get(tokens[j].key);
        if (!next) break;
        node = next;
        if (node.out.length) {
          let chosen = null;
          for (const word of node.out) {
            const entry = byWord.get(word);
            if (!entry) continue;
            if (!isLoaded(entry)) continue;
            if (!chosen || entry.f > chosen.f) chosen = entry;
          }
          if (chosen) {
            best = {
              word: chosen.w,
              start: tokens[i].start,
              end: tokens[j].end,
            };
          }
        }
      }
      if (best) {
        hits.push(best);
        i = tokens.findIndex((t) => t.start >= best.end);
        if (i === -1) i = tokens.length;
      } else {
        i += 1;
      }
    }
    return hits;
  }

  function highlightedHTML(text, hits) {
    let html = "";
    let cursor = 0;
    for (const hit of hits) {
      html += esc(text.slice(cursor, hit.start));
      const entry = byWord.get(hit.word);
      const adult = visibleSenses(entry).some((s) => s.c === "risque");
      html += `<span class="hit${adult ? " is-adult" : ""}" data-w="${esc(hit.word)}" tabindex="0">${esc(text.slice(hit.start, hit.end))}</span>`;
      cursor = hit.end;
    }
    html += esc(text.slice(cursor));
    return html;
  }

  /* ---------------------------------------------------------------------
     Cards
     --------------------------------------------------------------------- */

  const card = $("#wordCard");
  const backdrop = $("#cardBackdrop");
  const highlighted = $("#highlighted");

  function isMobile() {
    return window.innerWidth <= 760;
  }

  function cardHTML(entry) {
    const senses = visibleSenses(entry);
    const ctxs = visibleContexts(entry);
    const adult = senses.some((s) => s.c === "risque");
    return `
      <div class="card-top">
        <div>
          <h3 class="card-word">${esc(entry.w)}</h3>
          <div class="card-sub">
            <span>${ctxs.length} context${ctxs.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span><span class="freq-label">FREQ</span> ${Number(entry.f).toFixed(2)} (${frequencyLabel(Number(entry.f))})</span>
            ${adult ? '<span class="source-tag">18+</span>' : ""}
          </div>
        </div>
        <button class="card-close" type="button" aria-label="Close word card">×</button>
      </div>
      <div class="card-senses">
        ${senses
          .map(
            (sense) => `
          <div class="sense">
            <div class="sense-head">
              <span class="sense-ctx" style="--dot:${cssColor(sense.c)}">${dot(sense.c)}${esc(ctxLabel(sense.c))}</span>
              ${sense.s ? `<span class="sense-sub">${esc(sense.s)}</span>` : ""}
              <span class="sense-src">${sense.src === "LW" ? "LW" : "OEWN"}</span>
            </div>
            <p class="sense-def">${esc(sense.d)}</p>
            ${sense.e ? `<p class="sense-ex">${esc(sense.e)}</p>` : ""}
          </div>`
          )
          .join("")}
      </div>
      <div class="card-foot">OEWN = Open English WordNet 2024 · LW = hand-written for this project.</div>
    `;
  }

  function positionCard(anchor) {
    if (!anchor || typeof anchor.getBoundingClientRect !== "function") return;
    card.style.visibility = "hidden";
    card.hidden = false;
    const rect = anchor.getBoundingClientRect();
    const size = card.getBoundingClientRect();
    let left = rect.right + 12;
    if (left + size.width > window.innerWidth - 12) {
      left = rect.left - size.width - 12;
    }
    if (left < 12) left = Math.max(12, (window.innerWidth - size.width) / 2);
    let top = rect.top - 8;
    if (top + size.height > window.innerHeight - 12) {
      top = window.innerHeight - size.height - 12;
    }
    if (top < 12) top = 12;
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    card.style.visibility = "visible";
  }

  function openCard(word, anchor, pin = false) {
    const entry = byWord.get(word);
    if (!entry) return;
    const senses = visibleSenses(entry);
    if (!senses.length) return;
    clearTimeout(cardHideTimer);
    state.cardWord = word;
    state.pinned = pin;
    card.innerHTML = cardHTML(entry);
    const close = $(".card-close", card);
    if (close) close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeCard();
    });
    card.scrollTop = 0;
    if (isMobile()) {
      card.hidden = false;
      card.classList.add("is-sheet");
      card.style.left = "";
      card.style.top = "";
      card.style.visibility = "visible";
      backdrop.hidden = false;
      document.body.classList.add("card-open");
    } else {
      card.classList.remove("is-sheet");
      backdrop.hidden = true;
      document.body.classList.remove("card-open");
      positionCard(anchor);
    }
  }

  function closeCard() {
    clearTimeout(cardHideTimer);
    state.cardWord = null;
    state.pinned = false;
    card.hidden = true;
    card.classList.remove("is-sheet");
    card.innerHTML = "";
    card.style.left = "";
    card.style.top = "";
    card.style.visibility = "";
    backdrop.hidden = true;
    document.body.classList.remove("card-open");
  }

  function scheduleHide() {
    if (state.pinned) return;
    clearTimeout(cardHideTimer);
    cardHideTimer = setTimeout(() => {
      if (!state.pinned) closeCard();
    }, 180);
  }

  function bindWordElements(root = document) {
    for (const el of $$("[data-w]", root)) {
      if (el.dataset.bound === "1") continue;
      el.dataset.bound = "1";
      const word = el.dataset.w;
      if (HOVER_QUERY.matches) {
        el.addEventListener("mouseenter", () => {
          clearTimeout(cardHideTimer);
          openCard(word, el, false);
        });
        el.addEventListener("mouseleave", scheduleHide);
      }
      el.addEventListener("focus", () => openCard(word, el, false));
      el.addEventListener("blur", scheduleHide);
      el.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        event.stopPropagation();
        let anchor = el;
        if (el.classList.contains("hit-row")) {
          const first = $$(".hit", highlighted).find((node) => node.dataset.w === word);
          if (first) {
            if (typeof first.scrollIntoView === "function") {
              first.scrollIntoView({ block: "center", behavior: "smooth" });
            }
            anchor = first;
          }
        }
        openCard(word, anchor, true);
      });
      el.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openCard(word, el, true);
      });
    }
  }

  card.addEventListener("mouseenter", () => clearTimeout(cardHideTimer));
  card.addEventListener("mouseleave", scheduleHide);
  backdrop.addEventListener("click", closeCard);
  document.addEventListener("click", (event) => {
    if (!state.cardWord) return;
    if (event.target.closest("#wordCard") || event.target.closest("[data-w]")) return;
    if (isMobile()) closeCard();
    else if (state.pinned) closeCard();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCard();
  });
  window.addEventListener("scroll", () => {
    if (state.cardWord && !state.pinned && !isMobile()) closeCard();
  }, { passive: true });
  window.addEventListener("resize", closeCard);

  /* ---------------------------------------------------------------------
     Text view
     --------------------------------------------------------------------- */

  const textInput = $("#textInput");
  const charCount = $("#charCount");
  const textStats = $("#textStats");
  const hitList = $("#hitList");
  const hitCount = $("#hitCount");

  function renderSamples() {
    const row = $("#sampleRow");
    row.innerHTML = SAMPLES.map(
      (sample, index) =>
        `<button class="sample" type="button" data-sample="${index}" aria-pressed="${index === state.sample}">${esc(sample.label)}</button>`
    ).join("");
    for (const button of $$(".sample", row)) {
      button.addEventListener("click", () => {
        state.sample = Number(button.dataset.sample);
        textInput.value = SAMPLES[state.sample].text;
        renderSamples();
        renderText();
      });
    }
  }

  function renderHitList(hits) {
    if (!hits.length) {
      hitList.innerHTML = `<div class="empty-note">No loaded words in this text yet. Try a sample, or turn on risqué senses.</div>`;
      hitCount.textContent = "0 words";
      return;
    }
    const counts = new Map();
    for (const hit of hits) counts.set(hit.word, (counts.get(hit.word) || 0) + 1);
    const ranked = Array.from(counts, ([word, count]) => {
      const entry = byWord.get(word);
      return { entry, count, contexts: visibleContexts(entry).length };
    })
      .sort(
        (a, b) =>
          b.count - a.count ||
          b.contexts - a.contexts ||
          b.entry.f - a.entry.f ||
          a.entry.w.localeCompare(b.entry.w)
      );
    hitList.innerHTML = ranked
      .map(
        ({ entry, count }) => `
        <button class="hit-row" type="button" data-w="${esc(entry.w)}">
          <span class="hit-word">${esc(entry.w)}</span>
          <span class="hit-meta">
            <span class="mini-chips">${visibleContexts(entry).map((id) => ctxChip(id)).join("")}</span>
            <span class="hit-count">${count}</span>
          </span>
        </button>`
      )
      .join("");
    hitCount.textContent = `${ranked.length} word${ranked.length === 1 ? "" : "s"}`;
    bindWordElements(hitList);
  }

  function renderText() {
    const text = textInput.value;
    charCount.textContent = `${text.length.toLocaleString()} chars`;
    const hits = matchText(text);
    if (!text.trim()) {
      highlighted.innerHTML = "";
      textStats.textContent = "—";
      hitList.innerHTML = "";
      hitCount.textContent = "—";
      return;
    }
    if (!hits.length) {
      highlighted.textContent = text;
      textStats.textContent = "0 hits";
      renderHitList([]);
      return;
    }
    highlighted.innerHTML = highlightedHTML(text, hits);
    bindWordElements(highlighted);
    const unique = new Set(hits.map((h) => h.word)).size;
    textStats.textContent = `${hits.length} hit${hits.length === 1 ? "" : "s"} · ${unique} word${unique === 1 ? "" : "s"}`;
    renderHitList(hits);
  }

  /* ---------------------------------------------------------------------
     Dictionary
     --------------------------------------------------------------------- */

  const dictSearch = $("#dictSearch");
  const loadedOnly = $("#loadedOnly");
  const dictSort = $("#dictSort");
  const dictList = $("#dictList");
  const dictCount = $("#dictCount");
  const loadMore = $("#loadMore");
  const fuzzyBox = $("#fuzzyBox");
  const contextFilters = $("#contextFilters");

  function levenshtein(a, b) {
    if (a === b) return 0;
    const prev = new Array(b.length + 1);
    const curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j += 1) prev[j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
    }
    return prev[b.length];
  }

  function fuzzySuggest(query) {
    const q = norm(query);
    if (q.length < 2) return [];
    const threshold = q.length <= 3 ? 1 : q.length <= 5 ? 2 : 3;
    return entries
      .map((entry) => ({ entry, distance: levenshtein(q, norm(entry.w)) }))
      .filter((item) => item.distance <= threshold)
      .sort((a, b) => a.distance - b.distance || b.entry.f - a.entry.f)
      .slice(0, 7);
  }

  function renderContextFilters() {
    const counts = contextCounts();
    const allActive = state.dictContexts.size === 0 && state.comboFilter.length === 0;
    const chips = [
      `<button class="chip${allActive ? " is-active" : ""}" type="button" data-filter-all>All <span class="chip-count">${ALL_COUNT.toLocaleString()}</span></button>`,
    ];
    for (const ctx of CONTEXTS) {
      if (ctx.adult && !state.showRisque) continue;
      const active = state.dictContexts.has(ctx.id);
      chips.push(
        `<button class="chip${active ? " is-active" : ""}" type="button" data-filter-ctx="${ctx.id}" style="--chip-color:${ctx.color}">
          ${dot(ctx.id)}${esc(ctx.label)} <span class="chip-count">${counts[ctx.id].toLocaleString()}</span>
        </button>`
      );
    }
    contextFilters.innerHTML = chips.join("");
    for (const button of $$("[data-filter-ctx]", contextFilters)) {
      button.addEventListener("click", () => {
        const id = button.dataset.filterCtx;
        state.comboFilter = [];
        if (state.dictContexts.has(id)) state.dictContexts.delete(id);
        else state.dictContexts.add(id);
        state.limit = 80;
        renderDictionary();
      });
    }
    const all = $("[data-filter-all]", contextFilters);
    if (all) {
      all.addEventListener("click", () => {
        state.dictContexts.clear();
        state.comboFilter = [];
        state.limit = 80;
        renderDictionary();
      });
    }
  }

  function filteredEntries() {
    const q = norm(state.dictQuery);
    const base = entries.filter((entry) => {
      const ctxs = visibleContexts(entry);
      if (!ctxs.length) return false;
      if (state.loadedOnly && ctxs.length < 2) return false;
      if (state.dictContexts.size && !Array.from(state.dictContexts).every((id) => ctxs.includes(id))) return false;
      if (state.comboFilter.length && !state.comboFilter.every((id) => ctxs.includes(id))) return false;
      if (q && !norm(entry.w).includes(q)) return false;
      return true;
    });
    const sorters = {
      contexts: (a, b) =>
        visibleContexts(b).length - visibleContexts(a).length ||
        b.f - a.f ||
        a.w.localeCompare(b.w),
      freq: (a, b) =>
        b.f - a.f ||
        visibleContexts(b).length - visibleContexts(a).length ||
        a.w.localeCompare(b.w),
      az: (a, b) => a.w.localeCompare(b.w),
    };
    return base.sort(sorters[state.sort] || sorters.contexts);
  }

  function markQuery(word) {
    const q = state.dictQuery.trim();
    if (!q) return esc(word);
    const lower = word.toLowerCase();
    const index = lower.indexOf(q.toLowerCase());
    if (index < 0) return esc(word);
    return `${esc(word.slice(0, index))}<mark>${esc(word.slice(index, index + q.length))}</mark>${esc(word.slice(index + q.length))}`;
  }

  function wordRowHTML(entry) {
    const ctxs = visibleContexts(entry);
    return `
      <button class="word-row" type="button" data-w="${esc(entry.w)}">
        <span class="word-main">
          <span class="word-name">${markQuery(entry.w)}</span>
          <span class="word-sub"><span class="mini-chips">${ctxs.map((id) => ctxChip(id)).join("")}</span></span>
        </span>
        <span class="word-freq"><span class="freq-label">FREQ</span>${Number(entry.f).toFixed(1)}</span>
      </button>`;
  }

  function renderDictionary() {
    renderContextFilters();
    let filtered = filteredEntries();
    const q = norm(state.dictQuery);
    let exactMatches = entries;
    if (q) exactMatches = entries.filter((entry) => norm(entry.w).includes(q));
    if (q && !exactMatches.length) {
      const suggestions = fuzzySuggest(state.dictQuery);
      if (suggestions.length) {
        fuzzyBox.hidden = false;
        fuzzyBox.innerHTML = `No exact match. Did you mean ${suggestions
          .map(
            ({ entry }) =>
              `<button type="button" data-suggest="${esc(entry.w)}">${esc(entry.w)}</button>`
          )
          .join(", ")}?`;
        for (const button of $$("[data-suggest]", fuzzyBox)) {
          button.addEventListener("click", () => {
            state.dictQuery = button.dataset.suggest;
            dictSearch.value = button.dataset.suggest;
            state.limit = 80;
            renderDictionary();
          });
        }
      } else {
        fuzzyBox.hidden = false;
        fuzzyBox.textContent = "No exact or close match. Try a shorter word.";
      }
    } else {
      fuzzyBox.hidden = true;
      fuzzyBox.innerHTML = "";
    }

    const shown = filtered.slice(0, state.limit);
    dictCount.textContent = `${filtered.length.toLocaleString()} word${filtered.length === 1 ? "" : "s"}${state.dictQuery ? ` for “${state.dictQuery}”` : ""}`;
    if (!shown.length) {
      dictList.innerHTML = `<div class="empty-note">No words match these filters. <button class="button quiet" type="button" id="emptyReset">Reset</button></div>`;
      const reset = $("#emptyReset");
      if (reset) reset.addEventListener("click", resetFilters);
      loadMore.hidden = true;
      return;
    }
    dictList.innerHTML = shown.map(wordRowHTML).join("");
    bindWordElements(dictList);
    loadMore.hidden = filtered.length <= state.limit;
  }

  function resetFilters() {
    state.dictQuery = "";
    state.dictContexts.clear();
    state.comboFilter = [];
    state.sort = "contexts";
    state.loadedOnly = true;
    state.limit = 80;
    dictSearch.value = "";
    dictSort.value = "contexts";
    loadedOnly.checked = true;
    renderDictionary();
  }

  /* ---------------------------------------------------------------------
     Overlaps
     --------------------------------------------------------------------- */

  function comboGradient(ctxs) {
    const colors = ctxs.map((id) => cssColor(id));
    if (!colors.length) return "transparent";
    if (colors.length === 1) return colors[0];
    return `linear-gradient(90deg, ${colors.join(", ")})`;
  }

  function renderOverlaps() {
    const counts = contextCounts();
    const visibleLoaded = entries.filter(isLoaded);
    const allActive = state.overlapContexts.size === 0;
    $("#contextTotals").innerHTML = [
      `<button class="context-total${allActive ? " is-active" : ""}" type="button" data-overlap-all title="Show every overlap">
        <span class="context-name">All</span>
        <span class="context-count">${visibleLoaded.length.toLocaleString()}</span>
      </button>`,
      ...CONTEXTS.filter((ctx) => state.showRisque || !ctx.adult).map((ctx) => {
        const active = state.overlapContexts.has(ctx.id);
        return `
        <button class="context-total${active ? " is-active" : ""}" type="button" data-ctx="${ctx.id}" style="--chip-color:${ctx.color}" title="Filter overlaps containing ${esc(ctx.label)}">
          <span class="context-name">${dot(ctx.id)}${esc(ctx.label)}</span>
          <span class="context-count">${counts[ctx.id].toLocaleString()}</span>
        </button>`;
      }),
    ].join("");
    for (const button of $$("[data-ctx]", $("#contextTotals"))) {
      button.addEventListener("click", () => {
        const id = button.dataset.ctx;
        if (state.overlapContexts.has(id)) state.overlapContexts.delete(id);
        else state.overlapContexts.add(id);
        renderOverlaps();
      });
    }
    const all = $("[data-overlap-all]", $("#contextTotals"));
    if (all) {
      all.addEventListener("click", () => {
        state.overlapContexts.clear();
        renderOverlaps();
      });
    }

    const combos = new Map();
    for (const entry of visibleLoaded) {
      const ctxs = visibleContexts(entry);
      const n = ctxs.length;
      const maxSize = Math.min(4, n);
      for (let size = 2; size <= maxSize; size += 1) {
        const walk = (start, picked) => {
          if (picked.length === size) {
            const key = picked.join("|");
            if (!combos.has(key)) combos.set(key, { ctxs: picked.slice(), count: 0 });
            combos.get(key).count += 1;
            return;
          }
          for (let i = start; i < n; i += 1) {
            picked.push(ctxs[i]);
            walk(i + 1, picked);
            picked.pop();
          }
        };
        walk(0, []);
      }
    }

    const filteredCombos = Array.from(combos.values()).filter((combo) =>
      Array.from(state.overlapContexts).every((id) => combo.ctxs.includes(id))
    );
    const topCombos = filteredCombos
      .sort((a, b) => b.count - a.count || b.ctxs.length - a.ctxs.length || a.ctxs.join().localeCompare(b.ctxs.join()))
      .slice(0, 20);
    const maxCombo = Math.max(1, ...topCombos.map((c) => c.count));
    if (!topCombos.length) {
      $("#overlapBars").innerHTML = `<div class="empty-note">No overlaps contain every selected context. Clear a pill or press All.</div>`;
      return;
    }
    $("#overlapBars").innerHTML = topCombos
      .map((combo) => {
        const label = combo.ctxs.map((id) => ctxLabel(id)).join(" + ");
        const width = Math.max(3, (combo.count / maxCombo) * 100);
        return `
        <button class="overlap-row" type="button" data-combo="${esc(combo.ctxs.join("|"))}" title="${esc(label)} · ${combo.count} shared word${combo.count === 1 ? "" : "s"}">
          <span class="combo-label">${combo.ctxs
            .map((id, index) => `${index ? '<span class="plus">+</span>' : ""}<span class="mini-chip" style="--dot:${cssColor(id)}">${dot(id)}${esc(ctxLabel(id))}</span>`)
            .join("")}</span>
          <span class="combo-bar" aria-hidden="true">
            <span class="combo-fill" style="width:${width}%;background:${comboGradient(combo.ctxs)}"></span>
          </span>
          <span class="combo-count">${combo.count}</span>
        </button>`;
      })
      .join("");
    for (const button of $$("[data-combo]", $("#overlapBars"))) {
      button.addEventListener("click", () => {
        state.comboFilter = button.dataset.combo.split("|");
        state.dictContexts = new Set(state.comboFilter);
        state.dictQuery = "";
        state.limit = 80;
        dictSearch.value = "";
        setView("dictionary");
      });
    }
  }

  /* ---------------------------------------------------------------------
     Views and wiring
     --------------------------------------------------------------------- */

  function setView(view) {
    state.view = view;
    for (const tab of $$(".tab")) {
      const active = tab.dataset.view === view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    }
    for (const section of $$(".view")) {
      section.hidden = section.id !== `view-${view}`;
    }
    if (view === "dictionary") renderDictionary();
    if (view === "overlaps") renderOverlaps();
    if (view === "text") renderText();
    closeCard();
  }

  function renderHeroStats() {
    const stats = [
      `${ALL_COUNT.toLocaleString()} words`,
      `${SENSE_TOTAL.toLocaleString()} senses`,
      `${CONTEXTS.length} contexts`,
      `${LOADED_TOTAL.toLocaleString()} loaded`,
    ];
    $("#heroStats").innerHTML = stats.map((s) => `<span>${s}</span>`).join("");
  }

  function syncRisqueControls() {
    for (const input of $$(".risque-toggle")) {
      input.checked = state.showRisque;
      const chip = input.closest(".toggle-chip");
      if (chip) chip.classList.toggle("is-on", state.showRisque);
      const label = input.closest("label");
      const status = label && label.querySelector(".risque-state");
      if (status) status.textContent = state.showRisque ? "18+ · on" : "18+ · off";
    }
  }

  function wireEvents() {
    for (const tab of $$(".tab")) {
      tab.addEventListener("click", () => setView(tab.dataset.view));
    }

    for (const input of $$(".risque-toggle")) {
      input.addEventListener("change", (event) => {
        state.showRisque = event.target.checked;
        syncRisqueControls();
        state.dictContexts.delete("risque");
        state.overlapContexts.delete("risque");
        state.comboFilter = [];
        state.limit = 80;
        closeCard();
        if (state.view === "text") renderText();
        if (state.view === "dictionary") renderDictionary();
        if (state.view === "overlaps") renderOverlaps();
      });
    }

    textInput.addEventListener("input", () => {
      charCount.textContent = `${textInput.value.length.toLocaleString()} chars`;
      clearTimeout(textTimer);
      textTimer = setTimeout(renderText, 90);
    });
    $("#clearText").addEventListener("click", () => {
      textInput.value = "";
      renderText();
      textInput.focus();
    });

    dictSearch.addEventListener("input", () => {
      state.dictQuery = dictSearch.value;
      state.limit = 80;
      renderDictionary();
    });
    loadedOnly.addEventListener("change", (event) => {
      state.loadedOnly = event.target.checked;
      state.limit = 80;
      renderDictionary();
    });
    dictSort.addEventListener("change", (event) => {
      state.sort = event.target.value;
      state.limit = 80;
      renderDictionary();
    });
    $("#resetFilters").addEventListener("click", resetFilters);
    loadMore.addEventListener("click", () => {
      state.limit += 80;
      renderDictionary();
    });
  }

  function init() {
    if (!entries.length) {
      $("#heroStats").innerHTML = "<span>Data failed to load</span>";
      highlighted.textContent = "The word data did not load. Check that words.js is present and reload the page.";
      return;
    }
    renderHeroStats();
    formTrie = buildTrie();
    renderSamples();
    if (SAMPLES.length) {
      textInput.value = SAMPLES[0].text;
    }
    wireEvents();
    syncRisqueControls();
    setView("text");
    maybeOpenFromHash();
  }

  function maybeOpenFromHash() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!hash) return;
    const word = hash.toLowerCase();
    if (!byWord.has(word)) return;
    state.dictQuery = word;
    dictSearch.value = word;
    state.limit = 80;
    setView("dictionary");
  }

  init();

  // A small read-only surface for tests and debugging.
  window.__LOADED_WORDS__ = {
    entries,
    contexts: CONTEXTS,
    matchText,
    visibleContexts,
    state,
  };
})();
