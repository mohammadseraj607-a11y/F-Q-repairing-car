/*
  F&Q Car Repair Q&A
  Local “ML-like” ranker: TF-IDF vectors + cosine similarity.
  No network calls; all data embedded.
*/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const CATEGORIES = [
  { id: "battery", label: "Battery" },
  { id: "brakes", label: "Brakes" },
  { id: "engine", label: "Engine" },
  { id: "tires", label: "Tires" },
  { id: "oil", label: "Oil" },
];

const FAQS = [
  {
    id: "no-start-battery",
    category: "battery",
    question: "Car won’t start after replacing the battery",
    tags: ["won't start", "battery", "replace", "no crank"],
    answerTitle: "Likely causes + what to check",
    bullets: [
      "Verify the battery terminals are tight and the correct polarity is connected (+ to +, − to −).",
      "Check the ground connection to chassis (loose/painted contact can prevent cranking).",
      "Inspect battery cables for corrosion or damaged insulation; clean terminals and reattach firmly.",
      "If you hear no clicking: check the starter/relay fuses and the ignition switch signal.",
      "If you hear rapid clicking: check battery charge and look for a weak battery or high resistance at the terminals.",
    ],
    steps: [
      "Turn key to ON (dash lights). If lights are dim: battery may be depleted or connections are bad.",
      "Try starting again after cleaning/tightening terminals.",
      "If still no start, test starter relay and relevant fuses (or have a mechanic test with a multimeter).",
    ],
  },
  {
    id: "battery-drain",
    category: "battery",
    question: "Battery keeps going dead (parasitic drain)",
    tags: ["dead", "drain", "parasitic", "lights off"],
    answerTitle: "Common reasons",
    bullets: [
      "Interior lights, trunk/door switches, glovebox light, or a stuck relay can cause continuous draw.",
      "Aftermarket accessories (dash cams, trackers, poorly installed stereos) may draw power.",
      "A failing alternator can also lead to undercharging, making the battery appear to “go dead” sooner than expected.",
    ],
    steps: [
      "Check for any lights staying on after the car is locked (doors, trunk, hood, glovebox).",
      "If everything is off, measure battery draw with a current meter during the vehicle’s sleep period.",
      "If you’re not set up to measure amperage safely, use a qualified shop to locate the circuit.",
    ],
  },
  {
    id: "brake-squeal",
    category: "brakes",
    question: "Brake squeal at low speed",
    tags: ["squeal", "brake", "low speed", "pads"],
    answerTitle: "Most common cause",
    bullets: [
      "Brake pads often include wear indicators (“squealers”). When the pad is thin, you’ll hear squeal—especially at low speeds.",
      "Uneven rotor surface, dirty pads, or contaminated brake fluid can also cause noise.",
      "Sometimes glazing from hard braking can worsen noise; proper inspection is needed.",
    ],
    steps: [
      "Inspect pad thickness and rotor condition.",
      "If pads are near the wear limit, replace pads (and evaluate rotors).",
      "Avoid reusing contaminated pads; clean and inspect calipers/saddles.",
    ],
  },
  {
    id: "brake-pedal",
    category: "brakes",
    question: "Brake pedal feels soft/spongy",
    tags: ["soft", "spongy", "pedal", "air"],
    answerTitle: "Hydraulic system issues",
    bullets: [
      "Air in the brake lines (leaks, improper bleeding) often causes a spongy pedal.",
      "Low brake fluid or a leak can also affect pedal firmness.",
      "Worn brake hoses or internal master cylinder problems can contribute.",
    ],
    steps: [
      "Check brake fluid level and look for leaks around wheels/master cylinder.",
      "If fluid is low or leaks exist, don’t drive—repair first.",
      "If fluid is correct, the system may require bleeding (best done with correct procedure/spec).",
    ],
  },
  {
    id: "check-engine-misfire",
    category: "engine",
    question: "Check engine light with misfire",
    tags: ["check engine", "misfire", "spark", "fuel"],
    answerTitle: "Where to look first",
    bullets: [
      "Read diagnostic trouble codes (DTCs) with an OBD-II scanner—P0300/P0301 etc. indicate cylinder misfire(s).",
      "Common causes: spark plugs/coils, fuel injector issues, vacuum leaks, low compression, or exhaust leaks.",
      "Use freeze-frame data to see operating conditions when the fault occurred.",
    ],
    steps: [
      "Inspect spark plugs and ignition coils for wear/oil contamination.",
      "Check vacuum hoses and intake connections for leaks.",
      "Clear codes and test drive; if codes return, diagnose the affected cylinder(s).",
    ],
  },
  {
    id: "engine-overheating",
    category: "engine",
    question: "Engine overheating on highway",
    tags: ["overheat", "temperature", "coolant", "fan"],
    answerTitle: "Cooling system checks",
    bullets: [
      "Low coolant level or a coolant leak reduces heat transfer.",
      "A stuck thermostat can prevent proper coolant flow.",
      "Radiator airflow issues, failed cooling fans, or a clogged radiator can cause overheating.",
      "A failing water pump can also reduce circulation.",
    ],
    steps: [
      "Check coolant level when cool (don’t open a hot radiator/cap).",
      "Inspect hoses for bulges/leaks and confirm fan operation.",
      "If overheating persists, test thermostat operation and pressure-test the system.",
    ],
  },
  {
    id: "tire-low",
    category: "tires",
    question: "Tire keeps showing low pressure",
    tags: ["low pressure", "tire", "slow leak", "tpms"],
    answerTitle: "Find the leak",
    bullets: [
      "Slow leaks can come from a nail/screw, wheel valve stem, or bead leaks.",
      "Check for visible damage and confirm tire pressure manually (TPMS can be delayed or inaccurate).",
      "If you recently changed tires, check valve stems and wheel seating.",
    ],
    steps: [
      "Inspect tread and sidewall for punctures.",
      "Use soapy water to locate bubbles at the valve and around the bead.",
      "Repair/patch at a tire shop if the puncture is within repairable limits.",
    ],
  },
  {
    id: "steering-pull",
    category: "tires",
    question: "Car pulls to one side after rotating tires",
    tags: ["pull", "alignment", "rotation", "tires"],
    answerTitle: "Most likely causes",
    bullets: [
      "Tire pressure differences or uneven wear can make the car pull.",
      "Alignment issues (toe/camber) can persist even after rotation.",
      "If only one side tires were swapped, tread direction/balance matters.",
    ],
    steps: [
      "Verify pressures on all tires and confirm rotation pattern is correct.",
      "Inspect for uneven tread wear.",
      "If pull remains, get an alignment check (and re-balance if needed).",
    ],
  },
  {
    id: "oil-change-interval",
    category: "oil",
    question: "How often should I change engine oil?",
    tags: ["oil", "change", "interval", "maintenance"],
    answerTitle: "Use your vehicle’s spec",
    bullets: [
      "Follow the manufacturer’s recommended mileage/time and oil grade.",
      "Severe driving (short trips, extreme heat/cold, towing, dusty roads) usually means shorter intervals.",
      "If your oil is dirty/dark quickly, it likely needs more frequent changes.",
    ],
    steps: [
      "Check owner’s manual for interval and required oil spec (e.g., API/ACEA, viscosity).",
      "Track mileage and consider time-based intervals too.",
      "Always use the correct filter and check for leaks after the change.",
    ],
  },
  {
    id: "oil-leak",
    category: "oil",
    question: "Oil leak under the car (near front)",
    tags: ["oil leak", "front", "leak", "seal"],
    answerTitle: "Common leak points",
    bullets: [
      "Oil may be leaking from the oil pan gasket, valve cover gasket, or front crank seal.",
      "Loose drain plug or filter can also cause leaks.",
      "Drive carefully and clean the area so you can pinpoint the source.",
    ],
    steps: [
      "Wipe and monitor where the first fresh drip appears.",
      "Inspect drain plug and filter seating.",
      "If leak is near the crank area, pressure/inspection may be needed.",
    ],
  },
];

// ---------- ML-like ranker (TF-IDF + cosine similarity) ----------

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  const t = normalizeText(s);
  if (!t) return [];
  // Simple tokenization; keep words + numbers.
  return t.split(" ").filter(Boolean);
}

function buildTfIdfModel(docs) {
  // docs: [{text, meta}]
  const tokenized = docs.map((d) => tokenize(d.text));

  const df = new Map();
  for (const toks of tokenized) {
    const seen = new Set(toks);
    for (const tok of seen) df.set(tok, (df.get(tok) || 0) + 1);
  }

  const N = docs.length;
  const idf = new Map();
  for (const [tok, docFreq] of df.entries()) {
    // Smooth idf
    idf.set(tok, Math.log((N + 1) / (docFreq + 1)) + 1);
  }

  // precompute doc vectors (sparse)
  const vectors = tokenized.map((toks) => {
    const tf = new Map();
    for (const tok of toks) tf.set(tok, (tf.get(tok) || 0) + 1);
    const len = toks.length || 1;
    const vec = new Map();
    for (const [tok, count] of tf.entries()) {
      if (!idf.has(tok)) continue;
      const termTf = count / len;
      const weight = termTf * idf.get(tok);
      vec.set(tok, weight);
    }
    // magnitude
    let mag = 0;
    for (const w of vec.values()) mag += w * w;
    mag = Math.sqrt(mag);
    return { vec, mag };
  });

  return { idf, vectors, tokenizedCount: N };
}

function vectorizeQuery(query, model) {
  const toks = tokenize(query);
  if (toks.length === 0) return { vec: new Map(), mag: 0 };

  const tf = new Map();
  for (const tok of toks) tf.set(tok, (tf.get(tok) || 0) + 1);
  const len = toks.length || 1;

  const vec = new Map();
  for (const [tok, count] of tf.entries()) {
    if (!model.idf.has(tok)) continue;
    const termTf = count / len;
    const weight = termTf * model.idf.get(tok);
    vec.set(tok, weight);
  }

  let mag = 0;
  for (const w of vec.values()) mag += w * w;
  mag = Math.sqrt(mag);

  return { vec, mag };
}

function cosineSimilarity(a, am, b, bm) {
  if (am === 0 || bm === 0) return 0;
  // a,b are sparse maps
  // iterate smaller map
  let dot = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [tok, w] of small.entries()) {
    const w2 = large.get(tok);
    if (w2 != null) dot += w * w2;
  }
  return dot / (am * bm);
}

const model = buildTfIdfModel(
  FAQS.map((f) => {
    const text = [f.question, f.answerTitle, ...(f.bullets || []), ...(f.steps || [])].join(" ");
    return { text, meta: f.id };
  })
);

// ---------- UI rendering ----------

let currentCategory = null;

function renderCategoryChips() {
  const chips = $("#categoryChips");
  chips.innerHTML = "";

  for (const c of CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = c.label;
    btn.dataset.cat = c.id;
    btn.setAttribute("aria-selected", String(c.id === currentCategory));

    btn.addEventListener("click", () => {
      setCategory(c.id);
      // Mirror select
      $("#categorySelect").value = c.id;
      // Filter FAQ cards
      renderFaqGrid();
    });

    chips.appendChild(btn);
  }
}

function setCategory(catId) {
  currentCategory = catId;
  renderCategoryChips();
  try {
    localStorage.setItem("fqa_category", catId);
  } catch {}
}

function renderSelect() {
  const sel = $("#categorySelect");
  sel.innerHTML = "";

  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All categories";
  sel.appendChild(all);

  for (const c of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    sel.appendChild(opt);
  }
}

function highlightMatch(text, queryTokens) {
  if (!queryTokens.length) return text;
  let out = text;
  // Escape regex special chars
  const escaped = queryTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Only highlight short-ish tokens to avoid crazy highlights
  const meaningful = escaped.filter((t) => t.length >= 3 && t.length <= 18);
  if (meaningful.length === 0) return text;

  const re = new RegExp(`(${meaningful.join("|")})`, "gi");
  out = out.replace(re, "<mark>$1</mark>");
  return out;
}

function renderFaqGrid() {
  const grid = $("#faqGrid");
  const searchValue = $("#faqSearch").value.trim();
  const tokens = tokenize(searchValue);

  const filterCat = currentCategory;

  const filtered = FAQS
    .filter((f) => (filterCat ? f.category === filterCat : true))
    .filter((f) => {
      if (!searchValue) return true;
      const q = normalizeText(searchValue);
      const hay = normalizeText([f.question, f.answerTitle, ...(f.bullets || [])].join(" "));
      // simple contains scoring
      return hay.includes(q) || tokens.some((t) => hay.includes(t));
    });

  grid.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No FAQs match your search.";
    grid.appendChild(empty);
    return;
  }

  for (const f of filtered) {
    const card = document.createElement("div");
    card.className = "faq-card";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faq-q";

    const left = document.createElement("div");
    left.className = "q";
    left.innerHTML = highlightMatch(f.question, tokens);

    const badge = document.createElement("div");
    badge.className = "badge";
    const catLabel = (CATEGORIES.find((c) => c.id === f.category) || {}).label || f.category;
    badge.textContent = catLabel;

    btn.appendChild(left);
    btn.appendChild(badge);

    const content = document.createElement("div");
    content.className = "faq-a";
    content.style.display = "none";

    const p = document.createElement("p");
    p.innerHTML = `<strong>${f.answerTitle}</strong>`;
    content.appendChild(p);

    if (f.bullets?.length) {
      const ul = document.createElement("ul");
      for (const b of f.bullets) {
        const li = document.createElement("li");
        li.innerHTML = highlightMatch(b, tokens);
        ul.appendChild(li);
      }
      content.appendChild(ul);
    }

    if (f.steps?.length) {
      const p2 = document.createElement("p");
      p2.innerHTML = `<strong>Quick steps:</strong>`;
      content.appendChild(p2);

      const ul2 = document.createElement("ul");
      for (const s of f.steps) {
        const li = document.createElement("li");
        li.innerHTML = highlightMatch(s, tokens);
        ul2.appendChild(li);
      }
      content.appendChild(ul2);
    }

    btn.addEventListener("click", () => {
      const isOpen = content.style.display !== "none";
      // close others
      $$(".faq-a").forEach((el) => (el.style.display = "none"));
      content.style.display = isOpen ? "none" : "block";
    });

    card.appendChild(btn);
    card.appendChild(content);
    grid.appendChild(card);
  }
}

function formatAnswer(f, userQuery) {
  const qTokens = tokenize(userQuery);
  const bullets = (f.bullets || []).map((b) => `
    <li>${highlightMatch(b, qTokens)}</li>
  `).join("");

  const steps = (f.steps || []).map((s) => `
    <li>${highlightMatch(s, qTokens)}</li>
  `).join("");

  const catLabel = (CATEGORIES.find((c) => c.id === f.category) || {}).label || f.category;

  const bulletsHtml = f.bullets?.length ? `<ul>${bullets}
  </ul>` : "";
  const stepsHtml = f.steps?.length ? `<p class="meta"><strong>Quick steps:</strong></p><ul>${steps}</ul>` : "";

  return `
    <div class="title">${f.answerTitle}</div>
    <div class="meta">Category: ${catLabel}</div>
    <div class="body">
      ${bulletsHtml}
      ${stepsHtml}
      <div class="hint" style="margin-top:10px">
        Educational guidance only—if safety is at risk, consult a qualified mechanic.
      </div>
    </div>
  `;
}

function rankFaqs(userQuery, catFilter) {
  const qVec = vectorizeQuery(userQuery, model);
  if (qVec.mag === 0) return [];

  const scored = FAQS.map((f, idx) => {
    if (catFilter && f.category !== catFilter) return { f, score: -1 };
    const { vec, mag } = model.vectors[idx];
    const score = cosineSimilarity(qVec.vec, qVec.mag, vec, mag);
    return { f, score };
  }).filter((x) => x.score >= 0);

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function showAnswerFromInput() {
  const query = $("#query").value.trim();
  const out = $("#answer");

  if (!query) {
    out.innerHTML = `<div class="muted">Type a question first.</div>`;
    return;
  }

  const catSel = $("#categorySelect").value;
  const results = rankFaqs(query, catSel || null);

  if (!results.length) {
    out.innerHTML = `<div class="muted">No relevant FAQ found. Try different keywords or a different category.</div>`;
    return;
  }

  const top = results[0];
  // Threshold: if similarity very low, show a fallback.
  const threshold = 0.08;
  if (top.score < threshold) {
    out.innerHTML = `
      <div class="title">Need a better match?</div>
      <div class="meta">Try adding details like symptoms, when it happens, and what was recently replaced.</div>
      <div class="body">
        <div class="hint">Top match confidence is low. We can still suggest a starting point:</div>
        ${formatAnswer(top.f, query)}
      </div>
    `;
    return;
  }

  out.innerHTML = formatAnswer(top.f, query);
}

function init() {
  // Category
  renderSelect();

  let savedCat = null;
  try {
    savedCat = localStorage.getItem("fqa_category");
  } catch {}
  if (savedCat && CATEGORIES.some((c) => c.id === savedCat)) currentCategory = savedCat;
  else currentCategory = null;

  renderCategoryChips();

  if (currentCategory) $("#categorySelect").value = currentCategory;

  $("#categorySelect").addEventListener("change", (e) => {
    const val = e.target.value;
    setCategory(val || null);
    renderFaqGrid();
  });

  // FAQ filter
  $("#faqSearch").addEventListener("input", () => renderFaqGrid());

  renderFaqGrid();

  // Ask actions
  $("#btnAsk").addEventListener("click", showAnswerFromInput);

  // Quick option chips (more ways to ask)
  const optionRow = $("#optionRow");
  const optionChips = $("#optionChips");
  const optionSet = [
    { text: "car won’t start after replacing battery", cat: "battery" },
    { text: "battery keeps going dead (parasitic drain)", cat: "battery" },
    { text: "car cranks but won’t start", cat: "battery" },
    { text: "headlights are dim after startup", cat: "battery" },

    { text: "brake squeal at low speed", cat: "brakes" },
    { text: "brake pedal feels soft/spongy", cat: "brakes" },
    { text: "brake pedal goes to the floor", cat: "brakes" },
    { text: "brakes vibrate when stopping", cat: "brakes" },

    { text: "check engine light + misfire", cat: "engine" },
    { text: "engine overheating on highway", cat: "engine" },
    { text: "engine won’t idle / stalls", cat: "engine" },
    { text: "rough idle after changing spark plugs", cat: "engine" },

    { text: "tire keeps showing low pressure", cat: "tires" },
    { text: "car pulls to one side after rotating tires", cat: "tires" },
    { text: "steering wheel vibration while driving", cat: "tires" },
    { text: "TPMS light stays on after filling", cat: "tires" },

    { text: "oil leak under the car (near front)", cat: "oil" },
    { text: "how often should I change engine oil", cat: "oil" },
    { text: "oil level drops between changes", cat: "oil" },
    { text: "oil pressure light flickers", cat: "oil" },
  ];


  const renderOptionChips = (expanded) => {
    optionChips.innerHTML = "";
    const chips = expanded ? optionSet : optionSet.slice(0, 6);

    for (const opt of chips) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip option-chip";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => {
        $("#query").value = opt.text;
        setCategory(opt.cat);
        $("#categorySelect").value = opt.cat;
        renderFaqGrid();
        showAnswerFromInput();
      });
      optionChips.appendChild(btn);
    }
  };

  let optionsExpanded = false;
  renderOptionChips(optionsExpanded);
  $("#btnAddOptions").textContent = "More Options";


  $("#btnAddOptions").addEventListener("click", () => {
    const expanded = optionChips.children.length > 6;
    optionChips.innerHTML = "";
    const chips = expanded ? optionSet.slice(0, 6) : optionSet;

    // small UX: toggle button label
    const btn = $("#btnAddOptions");
    btn.textContent = expanded ? "More Options" : "Show Less";

    for (const opt of chips) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip option-chip";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => {
        $("#query").value = opt.text;
        setCategory(opt.cat);
        $("#categorySelect").value = opt.cat;
        renderFaqGrid();
        showAnswerFromInput();
      });
      optionChips.appendChild(btn);
    }
  });


  $("#btnDemo").addEventListener("click", () => {
    const demo = [
      "Car won’t start after replacing the battery",
      "Brake squeal at low speed",
      "Check engine light with misfire",
      "Engine overheating on highway",
      "Tire keeps showing low pressure",
      "Oil leak under the car near front",
    ];
    const pick = demo[Math.floor(Math.random() * demo.length)];
    $("#query").value = pick;
    // set a reasonable category based on keywords
    if (pick.toLowerCase().includes("battery")) setCategory("battery");
    if (pick.toLowerCase().includes("brake")) setCategory("brakes");
    if (pick.toLowerCase().includes("misfire") || pick.toLowerCase().includes("overheating")) setCategory("engine");
    if (pick.toLowerCase().includes("tire")) setCategory("tires");
    if (pick.toLowerCase().includes("oil")) setCategory("oil");
    $("#categorySelect").value = currentCategory || "";
    showAnswerFromInput();
  });

  $("#btnClear").addEventListener("click", () => {
    $("#query").value = "";
    $("#answer").innerHTML = "";
    $("#faqSearch").value = "";
    // keep category as a convenience
    renderFaqGrid();
  });

  // About
  const dialog = $("#aboutDialog");
  $("#btnAbout").addEventListener("click", () => dialog.showModal());

  // Enter to ask
  $("#query").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      showAnswerFromInput();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

